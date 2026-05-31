package com.satellite.changedetection;

import com.satellite.changedetection.config.ClassificationConfig;
import com.satellite.changedetection.config.KafkaTopicsConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({KafkaTopicsConfig.class, ClassificationConfig.class})
public class ChangeDetectionApplication {

	public static void main(String[] args) {
		SpringApplication.run(ChangeDetectionApplication.class, args);
	}

}
