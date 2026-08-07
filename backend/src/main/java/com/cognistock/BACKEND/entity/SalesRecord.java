package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import com.cognistock.backend.common.BaseEntity;
import java.time.LocalDate;

@Entity
@Table(name = "sales_records", indexes = {
    @Index(name = "idx_sale_date", columnList = "sale_date"),
    @Index(name = "idx_product_id", columnList = "product_id")
})
@Data
@EqualsAndHashCode(callSuper = false)
public class SalesRecord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantitySold;

    @Column(nullable = false)
    private LocalDate saleDate;

    @Column(nullable = false)
    private Double unitPrice;       // Sale ke waqt ka price

    @Column(nullable = false)
    private Double totalRevenue;    // quantitySold * unitPrice

    private String channel;         // ONLINE, OFFLINE, B2B

    private String notes;

    @PrePersist
    @PreUpdate
    protected void calculateRevenue() {
        if (quantitySold != null && unitPrice != null) {
            this.totalRevenue = quantitySold * unitPrice;
        }
    }
}