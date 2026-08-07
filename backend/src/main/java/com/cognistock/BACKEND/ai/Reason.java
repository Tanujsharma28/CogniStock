package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Reason {
    private Severity severity;
    private String message;
    private String evidence;
    private String impact;

    public enum Severity { HIGH, MEDIUM, LOW, INFO }
}