package com.satellite.data.service;

import com.satellite.data.entity.SatellitePass;
import com.satellite.data.repository.SatellitePassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SatellitePassService {

    private final SatellitePassRepository satellitePassRepository;

    public List<SatellitePass> getPassesByFieldId(UUID fieldId) {
        return satellitePassRepository.findByFieldId(fieldId);
    }

    public SatellitePass save(SatellitePass pass) {
        return satellitePassRepository.save(pass);
    }
}
