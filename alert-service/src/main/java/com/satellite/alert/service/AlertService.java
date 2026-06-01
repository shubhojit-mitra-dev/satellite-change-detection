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
    private final FcmService fcmService;

    // Hardcode your device's FCM token for the demo
    private static final String DEMO_FCM_TOKEN = "YOUR_DEVICE_FCM_TOKEN_HERE";

    public Alert createAlert(UUID fieldId, String severity, String message) {
        log.info("Creating new alert for fieldId: {} with severity: {}", fieldId, severity);
        Alert alert = Alert.builder()
                .fieldId(fieldId)
                .severity(severity)
                .message(message)
                .build();
        
        Alert savedAlert = alertRepository.save(alert);
        
        // Send push notification
        fcmService.sendAlertNotification(DEMO_FCM_TOKEN, severity, message);
        
        return savedAlert;
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
