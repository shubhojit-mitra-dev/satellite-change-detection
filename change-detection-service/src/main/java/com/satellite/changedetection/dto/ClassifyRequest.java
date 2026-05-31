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
public class ClassifyRequest {

    private String fieldId;

    @JsonProperty("delta_array")
    private List<Double> deltaArray;
}
