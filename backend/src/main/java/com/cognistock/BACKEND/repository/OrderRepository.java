package com.cognistock.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cognistock.backend.entity.Order;

public interface OrderRepository extends JpaRepository<Order, Long> {
}