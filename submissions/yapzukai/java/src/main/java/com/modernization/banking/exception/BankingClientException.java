package com.modernization.banking.exception;

/**
 * Custom exception for banking client operations
 * 
 * Provides structured error handling with error codes and causes
 */
public class BankingClientException extends Exception {

    private static final long serialVersionUID = 1L;

    private final String errorCode;
    private final transient Object details;

    public BankingClientException(String message) {
        this(message, "BANKING_ERROR", null, null);
    }

    public BankingClientException(String message, String errorCode) {
        this(message, errorCode, null, null);
    }

    public BankingClientException(String message, String errorCode, Throwable cause) {
        this(message, errorCode, cause, null);
    }

    public BankingClientException(String message, String errorCode, Throwable cause, Object details) {
        super(message, cause);
        this.errorCode = errorCode;
        this.details = details;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Object getDetails() {
        return details;
    }

    @Override
    public String toString() {
        return String.format("BankingClientException[code=%s, message=%s]", errorCode, getMessage());
    }
}