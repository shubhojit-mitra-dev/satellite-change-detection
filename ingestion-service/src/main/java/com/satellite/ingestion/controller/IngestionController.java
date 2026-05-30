package com.satellite.ingestion.controller;

import com.satellite.ingestion.dto.IngestTriggerRequest;
import com.satellite.ingestion.entity.IngestJob;
import com.satellite.ingestion.service.IngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/ingest")
@RequiredArgsConstructor
public class IngestionController {

    private final IngestionService ingestionService;

    @PostMapping("/trigger")
    public ResponseEntity<IngestJob> triggerIngestion(@RequestBody IngestTriggerRequest request) {
        double[] aoi = new double[]{
                request.getLonMin(),
                request.getLatMin(),
                request.getLonMax(),
                request.getLatMax()
        };
        
        IngestJob job = ingestionService.triggerIngestion(
                request.getFieldId(),
                aoi,
                request.getDate1(),
                request.getDate2()
        );
        
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
    }

    @GetMapping("/status/{jobId}")
    public ResponseEntity<IngestJob> getJobStatus(@PathVariable UUID jobId) {
        Optional<IngestJob> jobOptional = ingestionService.getJobStatus(jobId);
        
        return jobOptional
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }
}
