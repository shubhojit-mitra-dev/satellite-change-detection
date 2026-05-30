package com.satellite.data.service;

import com.satellite.data.entity.Field;
import com.satellite.data.repository.FieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FieldService {

    private final FieldRepository fieldRepository;

    public List<Field> getAllFields() {
        return fieldRepository.findAll();
    }

    public Field createField(Field field) {
        return fieldRepository.save(field);
    }

    public Optional<Field> getFieldById(UUID id) {
        return fieldRepository.findById(id);
    }
}
