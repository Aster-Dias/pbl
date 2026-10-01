package com.authentiq.repository;

import com.authentiq.entity.ScanEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScanEventRepository extends JpaRepository<ScanEvent, Long> {
    List<ScanEvent> findByProductIdOrderByTimestampDesc(String productId);
    Page<ScanEvent> findByProductIdOrderByTimestampDesc(String productId, Pageable pageable);
    
    long countByProductId(String productId);

    @Query("SELECT COUNT(DISTINCT s.deviceIdentifierHash) FROM ScanEvent s WHERE s.productId = :productId")
    long countDistinctDevicesByProductId(@Param("productId") String productId);

    @Query("SELECT s FROM ScanEvent s WHERE s.productId = :productId AND s.timestamp >= :since ORDER BY s.timestamp ASC")
    List<ScanEvent> findRecentScansByProductId(@Param("productId") String productId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(s) FROM ScanEvent s WHERE s.verificationResult = 'VALID'")
    long countValidScans();

    @Query("SELECT COUNT(s) FROM ScanEvent s WHERE s.verificationResult = 'INVALID'")
    long countInvalidScans();
}
