package com.cognistock.backend.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.cognistock.backend.dto.ForecastRequestDTO;
import com.cognistock.backend.dto.SalesPointDTO;
import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.repository.SalesRecordRepository;

@RestController
@RequestMapping("/api/forecast")
public class ForecastController {

    @Autowired
    private SalesRecordRepository salesRecordRepository;

    @Autowired
    private RestTemplate restTemplate;

    private static final String AI_SERVICE_URL = "http://localhost:8000/forecast";

    @GetMapping("/product/{productId}")
    public ResponseEntity<Object> getForecastForProduct(@PathVariable Long productId) {

        List<SalesRecord> records = salesRecordRepository.findAll().stream()
            .filter(r -> r.getProduct() != null && r.getProduct().getId().equals(productId))
            .collect(Collectors.toList());

        if (records.isEmpty()) {
            return ResponseEntity.badRequest().body("Is product ke liye sales history nahi mili");
        }

        List<SalesPointDTO> history = records.stream()
            .map(r -> {
                SalesPointDTO point = new SalesPointDTO();
                point.setDate(r.getSaleDate().toString());
                point.setQuantity(r.getQuantitySold());
                return point;
            })
            .collect(Collectors.toList());

        ForecastRequestDTO request = new ForecastRequestDTO();
        request.setHistory(history);
        request.setDaysAhead(30);

        Object forecastResponse = restTemplate.postForObject(AI_SERVICE_URL, request, Object.class);

        return ResponseEntity.ok(forecastResponse);
    }
}