package com.cognistock.backend.controller;

import com.cognistock.backend.service.MorningBriefService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/morning-brief")
public class MorningBriefController {

    @Autowired
    private MorningBriefService morningBriefService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getBrief() {
        return ResponseEntity.ok(morningBriefService.generate());
    }
}