package com.authentiq.repository;

import com.authentiq.entity.PublicKeyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PublicKeyRepository extends JpaRepository<PublicKeyRecord, Long> {
    Optional<PublicKeyRecord> findByKeyId(String keyId);
    List<PublicKeyRecord> findByManufacturerId(Long manufacturerId);
    List<PublicKeyRecord> findByActiveTrue();
    Optional<PublicKeyRecord> findFirstByManufacturerIdAndActiveTrueOrderByKeyVersionDesc(Long manufacturerId);
    Optional<PublicKeyRecord> findFirstByActiveTrueOrderByCreatedAtDesc();
}
