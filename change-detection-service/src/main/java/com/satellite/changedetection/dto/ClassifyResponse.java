package com.satellite.changedetection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassifyResponse {

    @JsonProperty("crop_growth_pct")
    private Double cropGrowthPct;

    @JsonProperty("crop_stress_pct")
    private Double cropStressPct;

    @JsonProperty("significant_change_pct")
    private Double significantChangePct;

    @JsonProperty("no_change_pct")
    private Double noChangePct;

    @JsonProperty("pixel_labels")
    private List<String> pixelLabels;
}
