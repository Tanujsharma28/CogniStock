package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import com.cognistock.backend.repository.SalesRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ForecastReasoningService implements AIReasoning {

    private final SalesRecordRepository salesRecordRepository;

    @Override
    public DomainType getDomain() { return DomainType.FORECAST; }

    @Override
    public int getOrder() { return 4; }

    @Override
    public ReasoningResult analyze() {
        LocalDate today = LocalDate.now();

        List<Object[]> recent7  = salesRecordRepository
            .getDailyRevenueTrend(today.minusDays(7), today);
        List<Object[]> recent30 = salesRecordRepository
            .getDailyRevenueTrend(today.minusDays(30), today);

        Double revenue7  = salesRecordRepository.getTotalRevenueBetween(today.minusDays(7), today);
        Double revenue30 = salesRecordRepository.getTotalRevenueBetween(today.minusDays(30), today);

        if (revenue7  == null) revenue7  = 0.0;
        if (revenue30 == null) revenue30 = 0.0;

        long activeDays7  = recent7.stream()
            .filter(r -> r[1] != null && ((Double) r[1]) > 0).count();
        long activeDays30 = recent30.stream()
            .filter(r -> r[1] != null && ((Double) r[1]) > 0).count();

        List<String> dataGaps = new ArrayList<>();
        List<Reason> reasons  = new ArrayList<>();
        List<Evidence> evidence = new ArrayList<>();
        List<String> actions  = new ArrayList<>();

        // Trend analysis
        double weeklyAvg  = activeDays7  > 0 ? revenue7  / activeDays7  : 0;
        double monthlyAvg = activeDays30 > 0 ? revenue30 / activeDays30 : 0;

        double trendScore;
        String trendDirection;

        if (activeDays30 < 3) {
            trendScore = 50;
            trendDirection = "INSUFFICIENT_DATA";
            dataGaps.add("Only " + activeDays30 + " days with sales in last 30 days. " +
                "Need at least 14 days of consistent sales data for reliable forecasting.");
        } else if (weeklyAvg > monthlyAvg * 1.1) {
            trendScore = 80;
            trendDirection = "GROWING";
        } else if (weeklyAvg < monthlyAvg * 0.7) {
            trendScore = 25;
            trendDirection = "DECLINING";
        } else {
            trendScore = 60;
            trendDirection = "STABLE";
        }

        // Reasons
        reasons.add(Reason.builder()
            .severity(trendDirection.equals("DECLINING")
                ? Reason.Severity.HIGH : Reason.Severity.INFO)
            .message("Revenue trend: " + trendDirection)
            .evidence(String.format(
                "7-day avg: ₹%.2f/day vs 30-day avg: ₹%.2f/day",
                weeklyAvg, monthlyAvg))
            .impact(trendDirection.equals("GROWING")
                ? "Demand increasing — ensure stock availability"
                : trendDirection.equals("DECLINING")
                ? "Demand falling — review pricing and marketing"
                : "Stable demand — maintain current strategy")
            .build());

        if (activeDays30 >= 3) {
            double projectedMonthly = weeklyAvg * 30;
            reasons.add(Reason.builder()
                .severity(Reason.Severity.INFO)
                .message(String.format("Projected monthly revenue: ₹%.2f", projectedMonthly))
                .evidence("Based on last 7-day average trend")
                .impact("Use for inventory and procurement planning")
                .build());
        }

        // Evidence
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("revenue7Days")
            .value(String.format("₹%.2f", revenue7))
            .description("Total revenue in last 7 days")
            .build());
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("revenue30Days")
            .value(String.format("₹%.2f", revenue30))
            .description("Total revenue in last 30 days")
            .build());
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("activeSalesDays")
            .value(activeDays30 + "/30")
            .description("Days with actual sales activity in last 30 days")
            .build());
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("trendDirection")
            .value(trendDirection)
            .description("Revenue trend derived from daily comparison")
            .build());

        // Actions
        if (trendDirection.equals("GROWING"))
            actions.add("Stock up — demand is increasing. Pre-order fast-moving products.");
        if (trendDirection.equals("DECLINING"))
            actions.add("Investigate demand drop — check pricing, competition, seasonality.");
        if (trendDirection.equals("INSUFFICIENT_DATA"))
            actions.add("Record daily sales consistently for 14+ days to enable forecasting.");
        actions.add("Review monthly revenue trend for seasonal patterns.");

        // Confidence
        double confidence;
        if (activeDays30 == 0) confidence = 10.0;
        else if (activeDays30 < 7) confidence = 40.0;
        else if (activeDays30 < 14) confidence = 65.0;
        else confidence = 85.0;

        return ReasoningResult.builder()
            .domain(DomainType.FORECAST)
            .score(Math.round(trendScore * 100.0) / 100.0)
            .label(ExplainableAIService.scoreToLevel(trendScore))
            .reasons(reasons)
            .evidence(evidence)
            .recommendedActions(actions)
            .confidence(confidence)
            .dataGaps(dataGaps)
            .build();
    }
}
