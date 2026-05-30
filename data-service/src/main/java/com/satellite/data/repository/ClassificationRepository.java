package com.satellite.data.repository;

import com.satellite.data.entity.Classification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClassificationRepository extends JpaRepository<Classification, UUID> {
}
