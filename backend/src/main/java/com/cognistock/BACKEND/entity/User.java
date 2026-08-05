package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String role; // ADMIN, MANAGER, STAFF

    @PrePersist
    protected void onCreate() {
        if (this.role == null) {
            this.role = "STAFF";
        }
    }
}