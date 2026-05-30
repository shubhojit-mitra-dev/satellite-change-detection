package com.satellite.data.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "change_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChangeRecord {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "field_id", nullable = false)
    private UUID fieldId;

    @Column(name = "date1", nullable = false)
    private LocalDate date1;

    @Column(name = "date2", nullable = false)
    private LocalDate date2;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "delta_array", columnDefinition = "jsonb")
    private String deltaArray;

    @Column(name = "changed_pixel_pct")
    private Double changedPixelPct;

    @Column(name = "status")
    private String status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
