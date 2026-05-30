package com.satellite.ingestion.producer;

import com.satellite.ingestion.entity.IngestJob;

public interface IngestionEventProducer {
    void publishJobCompleted(IngestJob job);
}
