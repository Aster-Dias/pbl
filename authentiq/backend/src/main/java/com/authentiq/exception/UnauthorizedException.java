package com.authentiq.exception;

public class UnauthorizedException extends AuthentiQException {
    public UnauthorizedException(String message) {
        super(message, "UNAUTHORIZED");
    }
}
