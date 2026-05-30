package com.satellite.data.repository;

import com.satellite.data.entity.ChangeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ChangeRecordRepository extends JpaRepository<ChangeRecord, UUID> {
}
