package com.cognistock.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class ForecastRequestDTO {
    private List<SalesPointDTO> history;
    private int daysAhead = 30;
}