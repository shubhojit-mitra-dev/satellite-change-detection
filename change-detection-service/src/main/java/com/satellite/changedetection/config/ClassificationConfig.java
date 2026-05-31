package com.satellite.changedetection.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "classification")
@Data
public class ClassificationConfig {
    
    private ServiceConfig service = new ServiceConfig();
    private double threshold;
    
    @Data
    public static class ServiceConfig {
        private String url;
    }
}
