package com.cognistock.backend.dto.request;

import lombok.Data;

@Data
public class SimulationRequestDTO {
    private int horizonDays = 7;
    private Integer reorderQty;
}