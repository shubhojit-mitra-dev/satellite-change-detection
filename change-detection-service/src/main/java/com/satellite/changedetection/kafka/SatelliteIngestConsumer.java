package com.satellite.changedetection.kafka;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.satellite.changedetection.client.ClassificationClient;
import com.satellite.changedetection.config.ClassificationConfig;
import com.satellite.changedetection.config.KafkaTopicsConfig;
import com.satellite.changedetection.dto.ClassifyResponse;
import com.satellite.changedetection.entity.ChangeRecord;
import com.satellite.changedetection.entity.Classification;
import com.satellite.changedetection.repository.ChangeRecordRepository;
import com.satellite.changedetection.repository.ClassificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SatelliteIngestConsumer {

    private final ChangeRecordRepository changeRecordRepository;
    private final ClassificationRepository classificationRepository;
    private final ClassificationClient classificationClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsConfig kafkaTopicsConfig;
    private final ClassificationConfig classificationConfig;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "#{kafkaTopicsConfig.ingest}", groupId = "change-detection-group")
    public void processIngestJob(Map<String, Object> payload) {
        log.info("Received ingest job payload: {}", payload);

        try {
            // 1. Extract fields from payload
            String fieldId = (String) payload.get("fieldId");
            String date1 = (String) payload.get("date1");
            String date2 = (String) payload.get("date2");
            String ndviDeltaJson = (String) payload.get("ndviDeltaPath");

            log.info("Processing fieldId: {}, date1: {}, date2: {}", fieldId, date1, date2);

            // 2. Parse ndviDeltaPath to get JSON and extract ndvi_delta
            JsonNode rootNode = objectMapper.readTree(ndviDeltaJson);
            JsonNode deltaNode = rootNode.get("ndvi_delta");
            List<Double> deltaArray = objectMapper.convertValue(deltaNode, new TypeReference<List<Double>>() {});
            
            // 3. Calculate changedPixelPct
            double threshold = classificationConfig.getThreshold();
            long changedCount = deltaArray.stream().filter(d -> Math.abs(d) > threshold).count();
            double changedPixelPct = ((double) changedCount / deltaArray.size()) * 100.0;
            
            log.info("Calculated changedPixelPct: {}% using threshold: {}", changedPixelPct, threshold);

            // 4. Build and save ChangeRecord
            String rawDeltaArrayStr = objectMapper.writeValueAsString(deltaArray);
            ChangeRecord changeRecord = ChangeRecord.builder()
                    .fieldId(UUID.fromString(fieldId))
                    .date1(LocalDate.parse(date1))
                    .date2(LocalDate.parse(date2))
                    .deltaArray(rawDeltaArrayStr)
                    .changedPixelPct(changedPixelPct)
                    .status("PROCESSED")
                    .build();

            changeRecord = changeRecordRepository.save(changeRecord);
            log.info("Saved ChangeRecord with ID: {}", changeRecord.getId());

            // 5. Call ClassificationClient
            log.info("Calling classification service for fieldId: {}", fieldId);
            ClassifyResponse classifyResponse = classificationClient.classify(fieldId, deltaArray);

            // 6. Build and save Classification entity
            String rawResponseStr = objectMapper.writeValueAsString(classifyResponse);
            Classification classification = Classification.builder()
                    .changeId(changeRecord.getId())
                    .cropGrowthPct(classifyResponse.getCropGrowthPct())
                    .cropStressPct(classifyResponse.getCropStressPct())
                    .noChangePct(classifyResponse.getNoChangePct())
                    .rawResult(rawResponseStr)
                    .build();

            classificationRepository.save(classification);
            log.info("Saved Classification linked to changeId: {}", changeRecord.getId());

            // 7. Determine severity
            String severity;
            if (classifyResponse.getCropStressPct() > 20) {
                severity = "CRITICAL";
            } else if (classifyResponse.getCropGrowthPct() > 30) {
                severity = "POSITIVE";
            } else {
                severity = "MODERATE";
            }
            log.info("Determined severity: {}", severity);

            // 8. Build downstream Kafka payload
            Map<String, Object> changePayload = new HashMap<>();
            changePayload.put("fieldId", fieldId);
            changePayload.put("changeRecordId", changeRecord.getId().toString());
            changePayload.put("changedPct", changedPixelPct);
            changePayload.put("severity", severity);

            // 9. Publish to satellite.change topic
            log.info("Publishing to change topic: {}", kafkaTopicsConfig.getChange());
            kafkaTemplate.send(kafkaTopicsConfig.getChange(), fieldId, changePayload);
            
            log.info("Successfully processed ingest job and published change event for fieldId: {}", fieldId);

        } catch (Exception e) {
            log.error("Error processing ingest job payload", e);
        }
    }
}
