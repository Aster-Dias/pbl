package com.authentiq.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(min = 2, max = 200)
    private String productName;

    @NotBlank(message = "Brand is required")
    @Size(min = 1, max = 100)
    private String brand;

    @Size(max = 100)
    private String category;

    @NotBlank(message = "Batch number is required")
    @Size(min = 1, max = 100)
    private String batchNumber;

    @NotNull(message = "Manufacturing date is required")
    private LocalDate manufacturingDate;

    @NotNull(message = "Expiry date is required")
    private LocalDate expiryDate;

    public CreateProductRequest() {}

    public CreateProductRequest(String productName, String brand, String category, String batchNumber, LocalDate manufacturingDate, LocalDate expiryDate) {
        this.productName = productName;
        this.brand = brand;
        this.category = category;
        this.batchNumber = batchNumber;
        this.manufacturingDate = manufacturingDate;
        this.expiryDate = expiryDate;
    }

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
}
