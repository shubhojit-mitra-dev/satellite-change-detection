package com.satellite.alert.controller;

import com.satellite.alert.entity.Alert;
import com.satellite.alert.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
@Slf4j
public class AlertController {

    private final AlertService alertService;

    @GetMapping("/{fieldId}")
    public ResponseEntity<List<Alert>> getAlertsByFieldId(@PathVariable UUID fieldId) {
        log.info("Received request to get alerts for fieldId: {}", fieldId);
        List<Alert> alerts = alertService.getAlertsByFieldId(fieldId);
        return ResponseEntity.ok(alerts);
    }

    @PostMapping("/acknowledge/{id}")
    public ResponseEntity<Alert> acknowledgeAlert(@PathVariable UUID id) {
        log.info("Received request to acknowledge alert with id: {}", id);
        return alertService.acknowledgeAlert(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
