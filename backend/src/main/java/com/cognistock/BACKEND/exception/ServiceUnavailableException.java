package com.cognistock.backend.exception;

public class ServiceUnavailableException extends RuntimeException {

    private final String service;

    public ServiceUnavailableException(String service, String reason) {
        super(service + " is currently unavailable: " + reason);
        this.service = service;
    }

    public ServiceUnavailableException(String service, String reason, Throwable cause) {
        super(service + " is currently unavailable: " + reason, cause);
        this.service = service;
    }

    public String getService() {
        return service;
    }
}