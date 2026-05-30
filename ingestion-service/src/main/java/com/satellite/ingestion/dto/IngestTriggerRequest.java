package com.satellite.ingestion.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngestTriggerRequest {
    private UUID fieldId;
    private double lonMin;
    private double latMin;
    private double lonMax;
    private double latMax;
    private String date1;
    private String date2;
}
