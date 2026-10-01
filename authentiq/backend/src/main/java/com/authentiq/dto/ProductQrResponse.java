package com.authentiq.dto;

public class ProductQrResponse {

    private String productId;
    private String qrCodeBase64;
    private String qrCodeDataUrl;
    private QrPayloadDto payload;

    public ProductQrResponse() {}

    public ProductQrResponse(String productId, String qrCodeBase64, String qrCodeDataUrl, QrPayloadDto payload) {
        this.productId = productId;
        this.qrCodeBase64 = qrCodeBase64;
        this.qrCodeDataUrl = qrCodeDataUrl;
        this.payload = payload;
    }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getQrCodeBase64() { return qrCodeBase64; }
    public void setQrCodeBase64(String qrCodeBase64) { this.qrCodeBase64 = qrCodeBase64; }

    public String getQrCodeDataUrl() { return qrCodeDataUrl; }
    public void setQrCodeDataUrl(String qrCodeDataUrl) { this.qrCodeDataUrl = qrCodeDataUrl; }

    public QrPayloadDto getPayload() { return payload; }
    public void setPayload(QrPayloadDto payload) { this.payload = payload; }
}
