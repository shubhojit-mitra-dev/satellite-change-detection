package com.satellite.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "satellite_passes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SatellitePass {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    @Column(name = "pass_date", nullable = false)
    private LocalDate passDate;

    @Builder.Default
    @Column(name = "satellite")
    private String satellite = "SENTINEL-2";

    @Column(name = "cloud_cover")
    private Double cloudCover;

    @Column(name = "ndvi_geojson", columnDefinition = "TEXT")
    private String ndviGeojson;
}
