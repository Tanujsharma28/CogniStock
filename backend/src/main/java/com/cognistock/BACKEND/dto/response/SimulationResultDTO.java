package com.cognistock.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SimulationResultDTO {

    private Long productId;
    private String productName;
    private Integer currentStock;
    private Double dailyDemand;
    private String trend;
    private Integer horizonDays;

    private ScenarioResult noAction;
    private ScenarioResult reorder;

    private LocalDateTime simulatedAt;

    @Data
    @Builder
    public static class ScenarioResult {
        private String scenario;
        private Integer reorderQty;
        private List<DayProjection> dailyProjection;
        private String stockoutDate;
        private Double totalRevenueAtRisk;
        private Double projectedHealthScore;
        private Double healthDelta;
        private String recommendation;
    }

    @Data
    @Builder
    public static class DayProjection {
        private int day;
        private String date;
        private int stock;
        private Double revenueAtRisk;
        private boolean stockedOut;
    }
}