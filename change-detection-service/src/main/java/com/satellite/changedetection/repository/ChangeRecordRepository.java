package com.satellite.changedetection.repository;

import com.satellite.changedetection.entity.ChangeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChangeRecordRepository extends JpaRepository<ChangeRecord, UUID> {
    List<ChangeRecord> findByFieldId(UUID fieldId);
}
