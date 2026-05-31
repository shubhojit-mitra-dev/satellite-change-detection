package com.satellite.changedetection.client;

import com.satellite.changedetection.config.ClassificationConfig;
import com.satellite.changedetection.dto.ClassifyRequest;
import com.satellite.changedetection.dto.ClassifyResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClassificationClient {

    private final RestTemplate restTemplate;
    private final ClassificationConfig classificationConfig;

    public ClassifyResponse classify(String fieldId, List<Double> deltaArray) {
        log.info("Initiating classification request for fieldId: {}", fieldId);
        
        ClassifyRequest request = ClassifyRequest.builder()
                .fieldId(fieldId)
                .deltaArray(deltaArray)
                .build();
        
        String url = classificationConfig.getService().getUrl() + "/classify";
        
        log.info("Sending POST request to Classification Service URL: {}", url);
        
        ClassifyResponse response = restTemplate.postForObject(url, request, ClassifyResponse.class);
        
        log.info("Successfully received classification response for fieldId: {}", fieldId);
        
        return response;
    }
}
