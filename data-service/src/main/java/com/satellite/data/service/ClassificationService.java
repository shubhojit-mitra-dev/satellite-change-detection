package com.satellite.data.service;

import com.satellite.data.entity.Classification;
import com.satellite.data.repository.ClassificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClassificationService {

    private final ClassificationRepository classificationRepository;

    public Classification save(Classification classification) {
        return classificationRepository.save(classification);
    }
}
