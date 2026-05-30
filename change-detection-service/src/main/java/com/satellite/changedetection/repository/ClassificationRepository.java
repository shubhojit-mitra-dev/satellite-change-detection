package com.satellite.changedetection.repository;

import com.satellite.changedetection.entity.Classification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClassificationRepository extends JpaRepository<Classification, UUID> {
}
