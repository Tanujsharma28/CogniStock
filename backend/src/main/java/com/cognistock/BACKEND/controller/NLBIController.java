package com.cognistock.backend.controller;

import com.cognistock.backend.service.NLBIService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/nlbi")
public class NLBIController {

    @Autowired
    private NLBIService nlbiService;

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> ask(@RequestBody Map<String, String> body) {
        String question = body.get("question");
        if (question == null || question.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("answer", "Please ask a question."));
        }
        String answer = nlbiService.answer(question);
        return ResponseEntity.ok(Map.of("answer", answer));
    }
}