package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "forecast_snapshots",
    indexes = {
        @Index(name = "idx_fs_product_date", columnList = "product_id, snapshot_date", unique = true)
    }
)
@Data
public class ForecastSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name")
    private String productName;

    // Jis din prediction li gayi
    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    // Python ne kya predict kiya — next 7 days ka total
    @Column(name = "predicted_quantity", nullable = false)
    private Integer predictedQuantity;

    // Horizon fixed: 7 days
    @Column(name = "prediction_horizon", nullable = false)
    private Integer predictionHorizon = 7;

    // 7 din baad fill hoga — sales_records se
    @Column(name = "actual_quantity")
    private Integer actualQuantity;

    // NULL jab tak actual nahi aaya
    @Column(name = "accuracy_percent")
    private Double accuracyPercent;

    @Column(name = "trend")
    private String trend;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt; // jab actual fill hua
}