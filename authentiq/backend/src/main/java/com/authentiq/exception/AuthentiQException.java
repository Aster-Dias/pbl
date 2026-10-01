package com.authentiq.exception;

public class AuthentiQException extends RuntimeException {
    private final String errorCode;

    public AuthentiQException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public AuthentiQException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}
