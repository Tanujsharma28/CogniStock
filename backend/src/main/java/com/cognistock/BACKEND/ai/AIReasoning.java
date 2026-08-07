package com.cognistock.backend.ai;

public interface AIReasoning {
    ReasoningResult analyze();
    DomainType getDomain();
    int getOrder(); // execution priority
}