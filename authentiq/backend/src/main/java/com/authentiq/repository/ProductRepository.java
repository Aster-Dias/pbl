package com.authentiq.repository;

import com.authentiq.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByProductId(String productId);
    boolean existsByProductId(String productId);
    List<Product> findByManufacturerId(Long manufacturerId);
    Page<Product> findByManufacturerId(Long manufacturerId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.manufacturerId = :mfgId AND " +
           "(LOWER(p.productName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.productId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.brand) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.batchNumber) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Product> searchProducts(@Param("mfgId") Long mfgId, @Param("query") String query, Pageable pageable);

    long countByManufacturerId(Long manufacturerId);
}
