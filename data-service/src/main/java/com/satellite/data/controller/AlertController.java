package com.satellite.data.controller;

import com.satellite.data.entity.Alert;
import com.satellite.data.service.AlertService;
import lombok.RequiredArgsConstructor;
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
public class AlertController {

    private final AlertService alertService;

    @GetMapping("/{fieldId}")
    public List<Alert> getAlertsByFieldId(@PathVariable UUID fieldId) {
        return alertService.getAlertsByFieldId(fieldId);
    }

    @PostMapping("/acknowledge/{id}")
    public ResponseEntity<Alert> acknowledgeAlert(@PathVariable UUID id) {
        return alertService.acknowledgeAlert(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
