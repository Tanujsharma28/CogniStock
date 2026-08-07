package com.cognistock.backend.controller;

import com.cognistock.backend.dto.AuthRequestDTO;
import com.cognistock.backend.dto.AuthResponseDTO;
import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.entity.User;
import com.cognistock.backend.repository.UserRepository;
import com.cognistock.backend.service.AuditLogService;
import com.cognistock.backend.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuditLogService auditLogService;

    @PostMapping("/register")
    public ResponseEntity<Object> register(@RequestBody AuthRequestDTO request,
                                            HttpServletRequest httpRequest) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered hai");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        auditLogService.log("REGISTER", "User", user.getEmail(),
            "New user registered: " + user.getEmail(),
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return ResponseEntity.ok(new AuthResponseDTO(token, user.getEmail(), user.getRole()));
    }

    @GetMapping("/generate-hash")
    public String generateHash() {
        return passwordEncoder.encode("admin123");
    }

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody AuthRequestDTO request,
                                         HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            // Failed login audit
            auditLogService.log("LOGIN_FAILED", "User",
                request.getEmail(),
                "Failed login attempt for: " + request.getEmail(),
                AuditLog.AuditStatus.FAILED, httpRequest);
            return ResponseEntity.status(401).body("Email ya password galat hai");
        }

        // Success login audit
        auditLogService.log("LOGIN", "User", user.getEmail(),
            "User logged in: " + user.getEmail() + " [" + user.getRole() + "]",
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return ResponseEntity.ok(new AuthResponseDTO(token, user.getEmail(), user.getRole()));
    }
}