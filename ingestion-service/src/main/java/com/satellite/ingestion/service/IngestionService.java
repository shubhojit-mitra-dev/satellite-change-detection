package com.satellite.ingestion.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.satellite.ingestion.component.GeeScriptRunner;
import com.satellite.ingestion.entity.IngestJob;
import com.satellite.ingestion.producer.IngestionEventProducer;
import com.satellite.ingestion.repository.IngestJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngestionService {

    private final IngestJobRepository ingestJobRepository;
    private final ObjectMapper objectMapper;
    private final GeeScriptRunner geeScriptRunner;
    private final IngestionEventProducer ingestionEventProducer;

    public IngestJob triggerIngestion(UUID fieldId, double[] aoi, String date1, String date2) {
        log.info("Starting ingestion for field: {}", fieldId);

        IngestJob job = IngestJob.builder()
                .fieldId(fieldId)
                .date1(date1)
                .date2(date2)
                .status("PENDING")
                .build();

        job = ingestJobRepository.save(job);
        log.info("Saved job {} with status PENDING", job.getId());

        try {
            job.setStatus("PROCESSING");
            job = ingestJobRepository.save(job);
            log.info("Updated job {} to PROCESSING", job.getId());

            String rawJson = geeScriptRunner.runScript(aoi, date1, date2);
            log.info("Received JSON output from GEE script for job {}", job.getId());

            // Parse that JSON string using Jackson ObjectMapper to extract the delta array
            JsonNode root = objectMapper.readTree(rawJson);
            // We just ensure it can be parsed and extract the tree as instructed.
            // The raw JSON is what gets stored in the DB.
            
            job.setNdviDeltaJson(rawJson);
            job.setStatus("COMPLETED");
            job = ingestJobRepository.save(job);
            log.info("Updated job {} to COMPLETED", job.getId());

            ingestionEventProducer.publishJobCompleted(job);
            log.info("Published completed event to Kafka for job {}", job.getId());

            return job;
        } catch (Exception e) {
            log.error("Job {} failed with exception: {}", job.getId(), e.getMessage(), e);
            job.setStatus("FAILED");
            ingestJobRepository.save(job);
            throw new RuntimeException("Ingestion failed", e);
        }
    }

    public Optional<IngestJob> getJobStatus(UUID jobId) {
        return ingestJobRepository.findById(jobId);
    }
}
