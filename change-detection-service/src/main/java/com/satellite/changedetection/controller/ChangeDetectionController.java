package com.satellite.changedetection.controller;

import com.satellite.changedetection.entity.ChangeRecord;
import com.satellite.changedetection.service.ChangeDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/change")
@RequiredArgsConstructor
@Slf4j
public class ChangeDetectionController {

    private final ChangeDetectionService changeDetectionService;

    @GetMapping("/{fieldId}/{date1}/{date2}")
    public ResponseEntity<List<ChangeRecord>> getChangeRecords(
            @PathVariable UUID fieldId,
            @PathVariable String date1,
            @PathVariable String date2) {
        
        log.info("Received request to get change records for fieldId: {} ignoring dates for now", fieldId);
        List<ChangeRecord> records = changeDetectionService.getChangeRecords(fieldId);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/delta/{jobId}")
    public ResponseEntity<ChangeRecord> getChangeRecordById(@PathVariable UUID jobId) {
        log.info("Received request to get change record by jobId: {}", jobId);
        return changeDetectionService.getChangeRecordById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
