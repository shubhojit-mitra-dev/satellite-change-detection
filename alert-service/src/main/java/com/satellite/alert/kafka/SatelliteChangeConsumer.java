package com.satellite.alert.kafka;

import com.satellite.alert.config.KafkaTopicsConfig;
import com.satellite.alert.entity.Alert;
import com.satellite.alert.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SatelliteChangeConsumer {

    private final AlertService alertService;
    private final KafkaTopicsConfig kafkaTopicsConfig;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "#{kafkaTopicsConfig.change}", groupId = "alert-group")
    public void processChangePayload(Map<String, Object> payload) {
        log.info("Received change payload: {}", payload);

        try {
            // 1. Extract payload variables
            String fieldId = (String) payload.get("fieldId");
            String severity = (String) payload.get("severity");
            String changeRecordId = (String) payload.get("changeRecordId");
            
            // Handle Number conversion safely (Double vs Integer from Jackson payload)
            Object pctObj = payload.get("changedPct");
            double changedPct = (pctObj instanceof Number) ? ((Number) pctObj).doubleValue() : 0.0;

            log.info("Extracted fieldId: {}, severity: {}, changeRecordId: {}, changedPct: {}", 
                     fieldId, severity, changeRecordId, changedPct);

            // 2. Build human-readable message
            String message;
            if ("CRITICAL".equalsIgnoreCase(severity)) {
                message = String.format("CRITICAL: Crop stress detected in field. %.2f%% of pixels show significant decline. (ChangeRecord ID: %s)", changedPct, changeRecordId);
            } else if ("POSITIVE".equalsIgnoreCase(severity)) {
                message = String.format("POSITIVE: Strong crop growth detected. %.2f%% of pixels show significant improvement. (ChangeRecord ID: %s)", changedPct, changeRecordId);
            } else {
                message = String.format("MODERATE: Moderate changes detected in field. %.2f%% of pixels affected. (ChangeRecord ID: %s)", changedPct, changeRecordId);
            }
            
            log.info("Generated alert message: {}", message);

            // 3. Create the alert and capture the saved entity
            Alert savedAlert = alertService.createAlert(UUID.fromString(fieldId), severity, message);

            // 4. Publish alert event to satellite.alerts
            Map<String, Object> alertPayload = new HashMap<>();
            alertPayload.put("alertId",  savedAlert.getId().toString());
            alertPayload.put("fieldId",  fieldId);
            alertPayload.put("severity", severity);
            alertPayload.put("message",  message);

            kafkaTemplate.send(kafkaTopicsConfig.getAlerts(), fieldId, alertPayload);

            log.info("Published alert event for alertId: {} on topic: {}",
                     savedAlert.getId(), kafkaTopicsConfig.getAlerts());
            
            log.info("Successfully processed change event and created alert for fieldId: {}", fieldId);

        } catch (Exception e) {
            log.error("Failed to process change payload", e);
        }
    }
}
