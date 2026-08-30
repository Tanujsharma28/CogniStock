package com.cognistock.backend.service;

import com.cognistock.backend.entity.ForecastSnapshot;
import com.cognistock.backend.repository.ForecastSnapshotRepository;
import com.cognistock.backend.repository.SalesRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastAccuracyService {

    private final ForecastSnapshotRepository snapshotRepository;
    private final SalesRecordRepository salesRecordRepository;

    // ── On-demand: eligible snapshots evaluate karo ───────────────────────────

    public void evaluateEligibleSnapshots() {
        // Cutoff: aaj se 7 din pehle ya usse purane snapshots eligible hain
        LocalDate cutoff = LocalDate.now().minusDays(7);
        List<ForecastSnapshot> eligible = snapshotRepository.findEligibleForEvaluation(cutoff);

        if (eligible.isEmpty()) {
            log.info("No eligible snapshots for evaluation");
            return;
        }

        log.info("Evaluating {} eligible forecast snapshots", eligible.size());

        for (ForecastSnapshot snapshot : eligible) {
            try {
                LocalDate start = snapshot.getSnapshotDate();
                LocalDate end   = start.plusDays(snapshot.getPredictionHorizon());

                // sales_records se actual quantity sum karo
                List<com.cognistock.backend.entity.SalesRecord> records =
                    salesRecordRepository.findBySaleDateBetweenOrderBySaleDateDesc(start, end);

                int actual = records.stream()
                    .filter(r -> r.getProduct() != null
                              && r.getProduct().getId().equals(snapshot.getProductId()))
                    .mapToInt(com.cognistock.backend.entity.SalesRecord::getQuantitySold)
                    .sum();

                snapshot.setActualQuantity(actual);
                snapshot.setAccuracyPercent(calculateAccuracy(
                    snapshot.getPredictedQuantity(), actual));
                snapshot.setEvaluatedAt(LocalDateTime.now());

                snapshotRepository.save(snapshot);

                log.info("Snapshot id={} productId={} predicted={} actual={} accuracy={}%",
                    snapshot.getId(), snapshot.getProductId(),
                    snapshot.getPredictedQuantity(), actual,
                    snapshot.getAccuracyPercent());

            } catch (Exception e) {
                log.warn("Failed to evaluate snapshot id={}: {}", snapshot.getId(), e.getMessage());
            }
        }
    }

    // ── Accuracy formula ──────────────────────────────────────────────────────

    // MAX(0, 1 - |predicted - actual| / predicted) * 100
    // predicted = 0 case: actual = 0 → 100%, actual > 0 → 0%
    double calculateAccuracy(int predicted, int actual) {
        if (predicted == 0) {
            return actual == 0 ? 100.0 : 0.0;
        }
        double raw = 1.0 - (Math.abs(predicted - actual) / (double) predicted);
        return Math.round(Math.max(0.0, raw) * 100.0 * 10.0) / 10.0;
    }

    // ── Overall accuracy response ─────────────────────────────────────────────

    public Map<String, Object> getAccuracyReport() {
        // Pehle eligible snapshots evaluate karo (on-demand)
        evaluateEligibleSnapshots();

        List<ForecastSnapshot> evaluated = snapshotRepository.findAllEvaluated();

        Map<String, Object> report = new LinkedHashMap<>();

        if (evaluated.isEmpty()) {
            report.put("overallAccuracy", null);
            report.put("evaluatedCount", 0);
            report.put("message", "No evaluated snapshots yet. Accuracy data will appear after 7 days of forecast tracking.");
            report.put("perProduct", List.of());
            return report;
        }

        // Overall average accuracy
        double overallAvg = evaluated.stream()
            .mapToDouble(ForecastSnapshot::getAccuracyPercent)
            .average()
            .orElse(0.0);
        overallAvg = Math.round(overallAvg * 10.0) / 10.0;

        // Per-product accuracy
        Map<Long, List<ForecastSnapshot>> byProduct = new LinkedHashMap<>();
        for (ForecastSnapshot fs : evaluated) {
            byProduct.computeIfAbsent(fs.getProductId(), k -> new ArrayList<>()).add(fs);
        }

        List<Map<String, Object>> perProduct = new ArrayList<>();
        for (Map.Entry<Long, List<ForecastSnapshot>> entry : byProduct.entrySet()) {
            List<ForecastSnapshot> snapshots = entry.getValue();
            ForecastSnapshot latest = snapshots.get(0); // already sorted DESC

            double productAvg = snapshots.stream()
                .mapToDouble(ForecastSnapshot::getAccuracyPercent)
                .average()
                .orElse(0.0);
            productAvg = Math.round(productAvg * 10.0) / 10.0;

            Map<String, Object> productEntry = new LinkedHashMap<>();
            productEntry.put("productId",        latest.getProductId());
            productEntry.put("productName",      latest.getProductName());
            productEntry.put("avgAccuracy",      productAvg);
            productEntry.put("snapshotCount",    snapshots.size());
            productEntry.put("latestPredicted",  latest.getPredictedQuantity());
            productEntry.put("latestActual",     latest.getActualQuantity());
            productEntry.put("latestAccuracy",   latest.getAccuracyPercent());
            productEntry.put("latestDate",       latest.getSnapshotDate().toString());
            productEntry.put("trend",            latest.getTrend());
            productEntry.put("confidence",       latest.getConfidence());

            perProduct.add(productEntry);
        }

        // Sort by avgAccuracy DESC
        perProduct.sort((a, b) ->
            Double.compare((Double) b.get("avgAccuracy"), (Double) a.get("avgAccuracy")));

        report.put("overallAccuracy", overallAvg);
        report.put("evaluatedCount", evaluated.size());
        report.put("message", null);
        report.put("perProduct", perProduct);
        return report;
    }
}
