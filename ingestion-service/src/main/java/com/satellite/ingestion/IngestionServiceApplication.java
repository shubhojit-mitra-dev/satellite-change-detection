package com.satellite.ingestion;

import com.satellite.ingestion.config.GeeConfig;
import com.satellite.ingestion.config.KafkaTopicsConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({GeeConfig.class, KafkaTopicsConfig.class})
public class IngestionServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(IngestionServiceApplication.class, args);
	}

}
