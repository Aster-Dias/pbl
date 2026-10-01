package com.authentiq.repository;

import com.authentiq.entity.ScanSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScanSummaryRepository extends JpaRepository<ScanSummary, Long> {
    Optional<ScanSummary> findByProductId(String productId);
    List<ScanSummary> findByRiskLevelIn(List<String> riskLevels);
    
    @Query("SELECT COUNT(s) FROM ScanSummary s WHERE s.riskLevel IN ('HIGH', 'CRITICAL')")
    long countProductsAtRisk();

    @Query("SELECT COUNT(s) FROM ScanSummary s WHERE s.status = 'SUSPICIOUS' OR s.status = 'CLONE_DETECTED'")
    long countSuspiciousProducts();
}
