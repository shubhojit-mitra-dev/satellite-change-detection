package com.satellite.data.service;

import com.satellite.data.entity.ChangeRecord;
import com.satellite.data.repository.ChangeRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChangeRecordService {

    private final ChangeRecordRepository changeRecordRepository;

    public ChangeRecord save(ChangeRecord record) {
        return changeRecordRepository.save(record);
    }

    public List<ChangeRecord> getByFieldId(UUID fieldId) {
        return changeRecordRepository.findByFieldId(fieldId);
    }
}
