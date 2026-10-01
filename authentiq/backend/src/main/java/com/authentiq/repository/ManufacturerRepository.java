package com.authentiq.repository;

import com.authentiq.entity.Manufacturer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ManufacturerRepository extends JpaRepository<Manufacturer, Long> {
    Optional<Manufacturer> findByEmail(String email);
    Optional<Manufacturer> findByOrganizationCode(String organizationCode);
    boolean existsByEmail(String email);
    boolean existsByOrganizationCode(String organizationCode);
}
