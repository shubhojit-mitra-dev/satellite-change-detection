package com.satellite.alert.service;

import com.satellite.alert.entity.Alert;
import com.satellite.alert.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;

    public Alert createAlert(UUID fieldId, String severity, String message) {
        log.info("Creating new alert for fieldId: {} with severity: {}", fieldId, severity);
        Alert alert = Alert.builder()
                .fieldId(fieldId)
                .severity(severity)
                .message(message)
                .build();
        
        return alertRepository.save(alert);
    }

    public List<Alert> getAlertsByFieldId(UUID fieldId) {
        return alertRepository.findByFieldId(fieldId);
    }

    public Optional<Alert> acknowledgeAlert(UUID id) {
        log.info("Acknowledging alert with id: {}", id);
        return alertRepository.findById(id).map(alert -> {
            alert.setAcknowledged(true);
            return alertRepository.save(alert);
        });
    }
}
