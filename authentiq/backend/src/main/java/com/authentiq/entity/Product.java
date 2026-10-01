package com.authentiq.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_product_pid", columnList = "productId", unique = true),
    @Index(name = "idx_product_mfg_id", columnList = "manufacturerId"),
    @Index(name = "idx_product_batch", columnList = "batchNumber")
})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String productId;

    @Column(nullable = false, length = 200)
    private String productName;

    @Column(nullable = false, length = 100)
    private String brand;

    @Column(length = 100)
    private String category;

    @Column(nullable = false, length = 100)
    private String batchNumber;

    @Column(nullable = false)
    private LocalDate manufacturingDate;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Column(nullable = false)
    private Long manufacturerId;

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Product() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public LocalDate getManufacturingDate() { return manufacturingDate; }
    public void setManufacturingDate(LocalDate manufacturingDate) { this.manufacturingDate = manufacturingDate; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public Long getManufacturerId() { return manufacturerId; }
    public void setManufacturerId(Long manufacturerId) { this.manufacturerId = manufacturerId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
