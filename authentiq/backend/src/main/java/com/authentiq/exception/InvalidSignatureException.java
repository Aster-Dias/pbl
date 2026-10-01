package com.authentiq.exception;

public class InvalidSignatureException extends AuthentiQException {
    public InvalidSignatureException(String message) {
        super(message, "INVALID_SIGNATURE");
    }
}
