package com.satellite.data.service;

import com.satellite.data.entity.Alert;
import com.satellite.data.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;

    public List<Alert> getAlertsByFieldId(UUID fieldId) {
        return alertRepository.findByFieldId(fieldId);
    }

    public Alert save(Alert alert) {
        return alertRepository.save(alert);
    }

    public Optional<Alert> acknowledgeAlert(UUID id) {
        return alertRepository.findById(id).map(alert -> {
            alert.setAcknowledged(true);
            return alertRepository.save(alert);
        });
    }
}
