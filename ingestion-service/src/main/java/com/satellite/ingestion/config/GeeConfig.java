package com.satellite.ingestion.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "gee")
@Data
public class GeeConfig {
    private String pythonPath;
    private String scriptPath;
}
