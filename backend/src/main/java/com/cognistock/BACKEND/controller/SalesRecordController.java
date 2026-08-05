package com.cognistock.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.repository.SalesRecordRepository;

@RestController
@RequestMapping("/api/sales")
public class SalesRecordController {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @GetMapping
    public List<SalesRecord> getAll() {
        return salesRecordRepository.findAll();
    }

    @PostMapping
    public SalesRecord create(@RequestBody SalesRecord record) {
        return salesRecordRepository.save(record);
    }
}