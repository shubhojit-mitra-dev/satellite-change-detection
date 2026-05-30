package com.satellite.ingestion.producer;

import com.satellite.ingestion.config.KafkaTopicsConfig;
import com.satellite.ingestion.entity.IngestJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaIngestionEventProducer implements IngestionEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsConfig kafkaTopicsConfig;

    @Override
    public void publishJobCompleted(IngestJob job) {
        log.info("Preparing to publish job completed event for job {}", job.getId());

        Map<String, Object> payload = new HashMap<>();
        payload.put("jobId", job.getId().toString());
        payload.put("fieldId", job.getFieldId().toString());
        payload.put("date1", job.getDate1());
        payload.put("date2", job.getDate2());
        payload.put("ndviDeltaPath", job.getNdviDeltaJson());

        String topic = kafkaTopicsConfig.getIngest();
        String messageKey = job.getId().toString();

        log.info("Sending message to Kafka topic '{}' with key '{}'", topic, messageKey);
        
        kafkaTemplate.send(topic, messageKey, payload);

        log.info("Successfully published job completed event to Kafka for job {}", job.getId());
    }
}
