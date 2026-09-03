package com.cognistock.backend.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.cognistock.backend.dto.ForecastRequestDTO;
import com.cognistock.backend.dto.SalesPointDTO;
import com.cognistock.backend.entity.ForecastSnapshot;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.exception.ServiceUnavailableException;
import com.cognistock.backend.repository.ForecastSnapshotRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SalesRecordRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastService {

    private final SalesRecordRepository salesRecordRepository;
    private final ProductRepository productRepository;
    private final ForecastSnapshotRepository snapshotRepository;   // NEW
    private final RestTemplate restTemplate;

    private static final String AI_SERVICE_URL = "http://localhost:8000/forecast";

    // ── Existing method — behavior unchanged, snapshot save added ─────────────
    public Object getForecast(Long productId) {
        List<SalesRecord> records
                = salesRecordRepository.findByProductIdOrderBySaleDateDesc(productId);

        if (records.isEmpty()) {
            log.warn("No sales history found for productId={}", productId);
            return Map.of("error", "Is product ke liye sales history nahi mili");
        }

        Product product = productRepository.findById(productId).orElse(null);

        List<SalesPointDTO> history = records.stream()
                .map(r -> {
                    SalesPointDTO point = new SalesPointDTO();
                    point.setDate(r.getSaleDate().toString());
                    point.setQuantity(r.getQuantitySold());
                    return point;
                })
                .toList();

        ForecastRequestDTO request = new ForecastRequestDTO();
        request.setHistory(history);
        request.setDaysAhead(30);
        if (product != null) {
            request.setCurrentStock(product.getStockQuantity());
        }

        try {
            Object response = restTemplate.postForObject(AI_SERVICE_URL, request, Object.class);
            log.info("Forecast received for productId={}, stock={}",
                    productId, product != null ? product.getStockQuantity() : "unknown");

            // Snapshot save karo
            if (response instanceof Map<?, ?> forecastMap && product != null) {
                saveSnapshotIfAbsent(productId, product.getName(), forecastMap);
            }

            return response;

        } catch (ResourceAccessException e) {
            // Python DOWN ya timeout
            log.error("Forecast service unreachable for productId={}: {}", productId, e.getMessage());
            throw new ServiceUnavailableException("Python Forecast Service",
                    "Service is down or timed out after 5s", e);

        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            // Python 4xx / 5xx
            log.error("Forecast service returned error {} for productId={}: {}",
                    e.getStatusCode(), productId, e.getMessage());
            throw new ServiceUnavailableException("Python Forecast Service",
                    "Service returned error: " + e.getStatusCode(), e);
        }
    }

    // ── Batch-optimised overload — called by WarningService ──────────────────
    // Accepts pre-loaded records and product so NO extra DB calls are made.
    // Python HTTP call is identical to getForecast().
    public Object getForecastWithHistory(Long productId,
            List<SalesRecord> preloadedRecords,
            Product product) {

        if (preloadedRecords == null || preloadedRecords.isEmpty()) {
            log.warn("No sales history provided for productId={}", productId);
            return Map.of("error", "Is product ke liye sales history nahi mili");
        }

        List<SalesPointDTO> history = preloadedRecords.stream()
                .map(r -> {
                    SalesPointDTO point = new SalesPointDTO();
                    point.setDate(r.getSaleDate().toString());
                    point.setQuantity(r.getQuantitySold());
                    return point;
                })
                .toList();

        ForecastRequestDTO request = new ForecastRequestDTO();
        request.setHistory(history);
        request.setDaysAhead(30);
        if (product != null) {
            request.setCurrentStock(product.getStockQuantity());
        }

        try {
            Object response = restTemplate.postForObject(AI_SERVICE_URL, request, Object.class);
            log.info("Forecast received (batch) for productId={}, stock={}",
                    productId, product != null ? product.getStockQuantity() : "unknown");

            if (response instanceof Map<?, ?> forecastMap && product != null) {
                saveSnapshotIfAbsent(productId, product.getName(), forecastMap);
            }

            return response;

        } catch (ResourceAccessException e) {
            log.error("Forecast service unreachable for productId={}: {}", productId, e.getMessage());
            throw new ServiceUnavailableException("Python Forecast Service",
                    "Service is down or timed out after 5s", e);

        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            log.error("Forecast service returned error {} for productId={}: {}",
                    e.getStatusCode(), productId, e.getMessage());
            throw new ServiceUnavailableException("Python Forecast Service",
                    "Service returned error: " + e.getStatusCode(), e);
        }
    }

    // ── Snapshot save — duplicate guard included ──────────────────────────────
    private void saveSnapshotIfAbsent(Long productId, String productName, Map<?, ?> forecastMap) {
        try {
            LocalDate today = LocalDate.now();

            // Duplicate check — same product + same date
            Optional<ForecastSnapshot> existing
                    = snapshotRepository.findByProductIdAndSnapshotDate(productId, today);

            if (existing.isPresent()) {
                log.debug("Snapshot already exists for productId={} date={}", productId, today);
                return;
            }

            // predictedQuantity extract karo
            // forecast array se next 7 days ka sum nikalo
            Object forecastArr = forecastMap.get("forecast");
            if (!(forecastArr instanceof List<?> forecastList) || forecastList.isEmpty()) {
                log.warn("forecast array missing in response for productId={}", productId);
                return;
            }

            int predictedQty = 0;
            int daysToSum = Math.min(7, forecastList.size());
            for (int i = 0; i < daysToSum; i++) {
                Object entry = forecastList.get(i);
                if (entry instanceof Map<?, ?> entryMap) {
                    Object pq = entryMap.get("predictedQuantity");
                    if (pq instanceof Number) {
                        predictedQty += ((Number) pq).intValue();
                    }
                }
            }

            // trend + confidence
            String trend = "STABLE";
            Object tr = forecastMap.get("trend");
            if (tr != null) {
                trend = tr.toString();
            }

            double confidence = 0.0;
            Object conf = forecastMap.get("confidence");
            if (conf instanceof Number) {
                confidence = ((Number) conf).doubleValue();
            }

            ForecastSnapshot snapshot = new ForecastSnapshot();
            snapshot.setProductId(productId);
            snapshot.setProductName(productName);
            snapshot.setSnapshotDate(today);
            snapshot.setPredictedQuantity(predictedQty);
            snapshot.setPredictionHorizon(7);
            snapshot.setTrend(trend);
            snapshot.setConfidence(confidence);
            // actualQuantity + accuracyPercent + evaluatedAt — null initially

            snapshotRepository.save(snapshot);
            log.info("Snapshot saved: productId={} date={} predicted={}", productId, today, predictedQty);

        } catch (Exception e) {
            // Snapshot save failure should NOT break the forecast response
            log.error("Failed to save forecast snapshot for productId={}: {}", productId, e.getMessage());
        }
    }
}
