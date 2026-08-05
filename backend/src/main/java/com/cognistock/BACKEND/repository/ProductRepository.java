package com.cognistock.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cognistock.backend.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
}