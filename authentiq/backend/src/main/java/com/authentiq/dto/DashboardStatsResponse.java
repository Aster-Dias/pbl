package com.authentiq.dto;

import java.util.List;

public class DashboardStatsResponse {

    private long totalProducts;
    private long totalScans;
    private long verifiedScans;
    private long suspiciousScans;
    private long invalidScans;
    private long productsAtRisk;
    private List<ProductResponse> recentProducts;
    private List<ScanEventDto> recentScans;

    public DashboardStatsResponse() {}

    public long getTotalProducts() { return totalProducts; }
    public void setTotalProducts(long totalProducts) { this.totalProducts = totalProducts; }

    public long getTotalScans() { return totalScans; }
    public void setTotalScans(long totalScans) { this.totalScans = totalScans; }

    public long getVerifiedScans() { return verifiedScans; }
    public void setVerifiedScans(long verifiedScans) { this.verifiedScans = verifiedScans; }

    public long getSuspiciousScans() { return suspiciousScans; }
    public void setSuspiciousScans(long suspiciousScans) { this.suspiciousScans = suspiciousScans; }

    public long getInvalidScans() { return invalidScans; }
    public void setInvalidScans(long invalidScans) { this.invalidScans = invalidScans; }

    public long getProductsAtRisk() { return productsAtRisk; }
    public void setProductsAtRisk(long productsAtRisk) { this.productsAtRisk = productsAtRisk; }

    public List<ProductResponse> getRecentProducts() { return recentProducts; }
    public void setRecentProducts(List<ProductResponse> recentProducts) { this.recentProducts = recentProducts; }

    public List<ScanEventDto> getRecentScans() { return recentScans; }
    public void setRecentScans(List<ScanEventDto> recentScans) { this.recentScans = recentScans; }
}
