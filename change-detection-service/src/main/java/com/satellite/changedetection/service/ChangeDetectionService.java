package com.satellite.changedetection.service;

import com.satellite.changedetection.entity.ChangeRecord;
import com.satellite.changedetection.repository.ChangeRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChangeDetectionService {

    private final ChangeRecordRepository changeRecordRepository;

    public List<ChangeRecord> getChangeRecords(UUID fieldId) {
        return changeRecordRepository.findByFieldId(fieldId);
    }

    public Optional<ChangeRecord> getChangeRecordById(UUID id) {
        return changeRecordRepository.findById(id);
    }
}
