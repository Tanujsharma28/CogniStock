package com.cognistock.backend.ai;

public interface RootCauseAnalyzer {
    CausalChain analyze();
    DomainType getDomain();
    int getOrder();
}