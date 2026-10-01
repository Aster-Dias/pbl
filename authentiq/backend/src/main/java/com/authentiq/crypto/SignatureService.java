package com.authentiq.crypto;

import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;

public interface SignatureService {

    KeyPair generateKeyPair();

    String sign(String canonicalPayload, PrivateKey privateKey);

    boolean verify(String canonicalPayload, String signatureBase64, PublicKey publicKey);

    boolean verify(String canonicalPayload, String signatureBase64, String publicKeyBase64);

    String encodePublicKey(PublicKey publicKey);

    PublicKey decodePublicKey(String publicKeyBase64);

    String encodePrivateKey(PrivateKey privateKey);

    PrivateKey decodePrivateKey(String privateKeyBase64);
}
