package com.authentiq.service;

import com.authentiq.exception.AuthentiQException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;

@Service
public class QrCodeService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public byte[] generateQrCodePng(String text, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 2);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");

            BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height, hints);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            throw new AuthentiQException("Failed to generate QR code: " + e.getMessage(), "QR_GENERATION_FAILED", e);
        }
    }

    public String generateQrCodeBase64(String text, int width, int height) {
        byte[] pngBytes = generateQrCodePng(text, width, height);
        return Base64.getEncoder().encodeToString(pngBytes);
    }

    public String generateQrCodeDataUrl(String text, int width, int height) {
        return "data:image/png;base64," + generateQrCodeBase64(text, width, height);
    }

    public String toJsonString(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new AuthentiQException("JSON serialization failed: " + e.getMessage(), "SERIALIZATION_FAILED", e);
        }
    }
}
