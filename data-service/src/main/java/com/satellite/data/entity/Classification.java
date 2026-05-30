package com.satellite.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "classifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Classification {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "change_id", nullable = false)
    private UUID changeId;

    @Column(name = "crop_growth_pct")
    private Double cropGrowthPct;

    @Column(name = "crop_stress_pct")
    private Double cropStressPct;

    @Column(name = "no_change_pct")
    private Double noChangePct;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_result", columnDefinition = "jsonb")
    private String rawResult;
}
