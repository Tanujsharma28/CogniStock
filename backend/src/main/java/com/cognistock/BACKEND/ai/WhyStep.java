package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WhyStep {
    private int level;           // 1-5
    private String question;     // "Why?"
    private String answer;       // Finding
    private String evidence;     // Data proof
    private boolean isRootCause; // True at final level
}