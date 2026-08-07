package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.cognistock.backend.common.BaseEntity;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "suppliers")
@Data
@EqualsAndHashCode(callSuper = false)
public class Supplier extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String contactPerson;

    @Column(unique = true)
    private String email;

    private String phone;

    private String address;

    private Integer deliveryDays;

    private Double pricePerUnit;

    private Double reliabilityScore;
}