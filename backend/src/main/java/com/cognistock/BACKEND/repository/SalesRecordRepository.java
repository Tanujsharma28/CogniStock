package com.cognistock.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cognistock.backend.entity.SalesRecord;

public interface SalesRecordRepository extends JpaRepository<SalesRecord, Long> {
}