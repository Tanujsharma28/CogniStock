package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.cognistock.backend.common.BaseEntity;
import lombok.EqualsAndHashCode;
@Entity
@Table(name = "users")
@Data
@EqualsAndHashCode(callSuper = false)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String role;

    @PrePersist
    protected void setDefaultRole() {
        if (this.role == null) {
            this.role = "STAFF";
        }
    }
}