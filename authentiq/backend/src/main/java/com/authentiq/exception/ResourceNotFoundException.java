package com.authentiq.exception;

public class ResourceNotFoundException extends AuthentiQException {
    public ResourceNotFoundException(String message) {
        super(message, "RESOURCE_NOT_FOUND");
    }
}
