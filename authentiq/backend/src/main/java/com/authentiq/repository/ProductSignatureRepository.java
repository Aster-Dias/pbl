package com.authentiq.repository;

import com.authentiq.entity.ProductSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductSignatureRepository extends JpaRepository<ProductSignature, Long> {
    Optional<ProductSignature> findByProductId(String productId);
    boolean existsByProductId(String productId);
}
