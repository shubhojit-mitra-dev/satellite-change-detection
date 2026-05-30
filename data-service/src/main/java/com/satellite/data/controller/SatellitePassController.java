package com.satellite.data.controller;

import com.satellite.data.entity.SatellitePass;
import com.satellite.data.service.SatellitePassService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/ndvi")
@RequiredArgsConstructor
public class SatellitePassController {

    private final SatellitePassService satellitePassService;

    @GetMapping("/{fieldId}")
    public List<SatellitePass> getPassesByFieldId(@PathVariable UUID fieldId) {
        return satellitePassService.getPassesByFieldId(fieldId);
    }
}
