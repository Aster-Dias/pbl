package com.authentiq.service;

import com.authentiq.dto.PublicKeyDto;
import com.authentiq.entity.PublicKeyRecord;
import com.authentiq.exception.ResourceNotFoundException;
import com.authentiq.repository.PublicKeyRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class KeyService {

    private final PublicKeyRepository publicKeyRepository;

    public KeyService(PublicKeyRepository publicKeyRepository) {
        this.publicKeyRepository = publicKeyRepository;
    }

    public List<PublicKeyDto> getAllActivePublicKeys() {
        return publicKeyRepository.findByActiveTrue().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public PublicKeyDto getPublicKeyById(String keyId) {
        PublicKeyRecord record = publicKeyRepository.findByKeyId(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("Public key not found with keyId: " + keyId));
        return mapToDto(record);
    }

    private PublicKeyDto mapToDto(PublicKeyRecord k) {
        return new PublicKeyDto(
                k.getKeyId(),
                k.getManufacturerId(),
                k.getKeyVersion(),
                k.getAlgorithm(),
                k.getCurve(),
                k.getPublicKey(),
                k.getActive(),
                k.getCreatedAt(),
                k.getExpiresAt()
        );
    }
}
