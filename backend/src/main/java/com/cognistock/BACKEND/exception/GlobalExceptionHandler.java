package com.cognistock.backend.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import com.cognistock.backend.exception.ServiceUnavailableException;
import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Autowired
    private AuditLogService auditLogService;

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest req) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(buildError(404, "Not Found", ex.getMessage(), null, req.getRequestURI()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(
            BusinessException ex, HttpServletRequest req) {
        log.warn("Business rule violation: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(buildError(400, "Bad Request", ex.getMessage(), null, req.getRequestURI()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(
            UnauthorizedException ex, HttpServletRequest req) {
        log.warn("Unauthorized access: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(buildError(403, "Forbidden", ex.getMessage(), null, req.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> fieldErrors.put(e.getField(), e.getDefaultMessage()));
        log.warn("Validation failed: {}", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(buildError(400, "Validation Failed", "Input validation failed", fieldErrors, req.getRequestURI()));
    }
        @ExceptionHandler(ServiceUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleServiceUnavailable(
            ServiceUnavailableException ex, HttpServletRequest req) {
        log.warn("Service unavailable [{}]: {}", ex.getService(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(buildError(503, "Service Unavailable", ex.getMessage(), null, req.getRequestURI()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArg(
            IllegalArgumentException ex, HttpServletRequest req) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(buildError(400, "Bad Request", ex.getMessage(), null, req.getRequestURI()));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex,
            HttpServletRequest req) {
        log.warn("Access denied at {}: {}", req.getRequestURI(), ex.getMessage());

        // Audit log — ACCESS_DENIED
        auditLogService.log(
            "ACCESS_DENIED",
            extractResource(req.getRequestURI()),
            null,
            "Denied: " + req.getMethod() + " " + req.getRequestURI(),
            AuditLog.AuditStatus.DENIED,
            req
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(buildError(403, "Forbidden",
                "You don't have permission to perform this action.",
                null, req.getRequestURI()));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            org.springframework.dao.DataIntegrityViolationException ex,
            HttpServletRequest req) {
        log.warn("Data integrity violation at {}: {}", req.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(buildError(409, "Conflict",
                "Cannot delete this record as it is referenced by other records.",
                null, req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest req) {
        log.error("Unexpected error at [{}]: {}", req.getRequestURI(), ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(buildError(500, "Internal Server Error",
                "Something went wrong. Please try again.", null, req.getRequestURI()));
    }

    // URI se resource type nikalo — /api/products/1 → Product
    private String extractResource(String uri) {
        if (uri.contains("/products")) return "Product";
        if (uri.contains("/suppliers")) return "Supplier";
        if (uri.contains("/orders")) return "Order";
        if (uri.contains("/users")) return "User";
        if (uri.contains("/audit-logs")) return "AuditLog";
        return "Resource";
    }

    private ErrorResponse buildError(int status, String error, String message,
                                      Map<String, String> fieldErrors, String path) {
        return ErrorResponse.builder()
            .status(status)
            .error(error)
            .message(message)
            .fieldErrors(fieldErrors)
            .timestamp(LocalDateTime.now())
            .path(path)
            .build();
    }
}