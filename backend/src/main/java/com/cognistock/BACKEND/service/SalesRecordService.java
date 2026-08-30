package com.cognistock.backend.service;

import com.cognistock.backend.common.PageResponse;
import com.cognistock.backend.dto.request.SalesRecordRequest;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.exception.ResourceNotFoundException;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SalesRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SalesRecordService {

    private static final int MAX_PAGE_SIZE = 100;

    private final SalesRecordRepository salesRecordRepository;
    private final ProductRepository productRepository;

    public SalesRecord create(SalesRecordRequest request) {
        Product product = productRepository.findById(request.getProductId())
            .orElseThrow(() -> new ResourceNotFoundException("Product", "id", request.getProductId()));

        SalesRecord record = new SalesRecord();
        record.setProduct(product);
        record.setQuantitySold(request.getQuantitySold());
        record.setSaleDate(request.getSaleDate());
        record.setUnitPrice(request.getUnitPrice());
        record.setChannel(request.getChannel());
        record.setNotes(request.getNotes());

        // Stock update
        product.setStockQuantity(product.getStockQuantity() - request.getQuantitySold());
        productRepository.save(product);

        SalesRecord saved = salesRecordRepository.save(record);
        log.info("Sale recorded — product: {}, qty: {}, revenue: {}",
            product.getName(), request.getQuantitySold(), saved.getTotalRevenue());
        return saved;
    }

    public PageResponse<SalesRecord> getAll(int page, int size) {
        int clampedSize = Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(page, clampedSize);
        Page<SalesRecord> resultPage = salesRecordRepository.findAllWithProduct(pageable);
        return PageResponse.from(resultPage);
    }

    public List<SalesRecord> getByDateRange(LocalDate start, LocalDate end) {
        return salesRecordRepository.findBySaleDateBetweenOrderBySaleDateDesc(start, end);
    }

    public List<SalesRecord> getByProduct(Long productId) {
        return salesRecordRepository.findByProductIdOrderBySaleDateDesc(productId);
    }

    // Dashboard ke liye summary
    public Map<String, Object> getSummary(LocalDate start, LocalDate end) {
        Double totalRevenue = salesRecordRepository.getTotalRevenueBetween(start, end);
        List<Object[]> topProducts = salesRecordRepository.getTopProductsBetween(start, end);
        List<Object[]> dailyTrend = salesRecordRepository.getDailyRevenueTrend(start, end);
        List<Object[]> monthly = salesRecordRepository.getMonthlyRevenue();
        List<Product> deadStock = salesRecordRepository.findDeadStockSince(
            LocalDate.now().minusDays(30));

        // Top products format
        List<Map<String, Object>> topProductsList = topProducts.stream().map(row -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("productId", row[0]);
            map.put("productName", row[1]);
            map.put("totalQuantity", row[2]);
            map.put("totalRevenue", row[3]);
            return map;
        }).toList();

        // Daily trend format
        List<Map<String, Object>> trendList = dailyTrend.stream().map(row -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", row[0]);
            map.put("revenue", row[1]);
            return map;
        }).toList();

        // Monthly format
        List<Map<String, Object>> monthlyList = monthly.stream().map(row -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("year", row[0]);
            map.put("month", row[1]);
            map.put("revenue", row[2]);
            return map;
        }).toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRevenue", totalRevenue != null ? totalRevenue : 0.0);
        summary.put("topProducts", topProductsList);
        summary.put("dailyTrend", trendList);
        summary.put("monthlyRevenue", monthlyList);
        summary.put("deadStockCount", deadStock.size());
        summary.put("deadStockProducts", deadStock.stream()
            .map(p -> Map.of("id", p.getId(), "name", p.getName(),
                             "stock", p.getStockQuantity()))
            .toList());
        return summary;
    }
}