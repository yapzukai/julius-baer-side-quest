package com.modernization.banking.validation;

import java.util.Set;
import java.util.regex.Pattern;

import com.modernization.banking.exception.BankingClientException;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

/**
 * Input validation and sanitization utility
 * 
 * Provides comprehensive validation for all banking client inputs
 */
public class InputValidator {

    private final Validator validator;
    private static final Pattern ACCOUNT_ID_PATTERN = Pattern.compile("^[A-Z0-9]+$");
    private static final double MAX_AMOUNT = 1_000_000.0;

    public InputValidator() {
        var factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    /**
     * Validate and sanitize account ID
     * 
     * @param accountId Raw account ID
     * @return Sanitized account ID
     * @throws BankingClientException If account ID is invalid
     */
    public String validateAndSanitizeAccountId(String accountId) throws BankingClientException {
        if (accountId == null || accountId.trim().isEmpty()) {
            throw new BankingClientException("Account ID cannot be null or empty", "INVALID_ACCOUNT_ID");
        }

        var sanitized = accountId.trim().toUpperCase();

        if (!ACCOUNT_ID_PATTERN.matcher(sanitized).matches()) {
            throw new BankingClientException(
                    "Account ID contains invalid characters. Only alphanumeric characters allowed.",
                    "INVALID_ACCOUNT_ID");
        }

        return sanitized;
    }

    /**
     * Validate transfer amount
     * 
     * @param amount Amount to validate
     * @return Validated amount rounded to 2 decimal places
     * @throws BankingClientException If amount is invalid
     */
    public Double validateAmount(Double amount) throws BankingClientException {
        if (amount == null) {
            throw new BankingClientException("Amount cannot be null", "INVALID_AMOUNT");
        }

        if (amount <= 0) {
            throw new BankingClientException("Amount must be positive", "INVALID_AMOUNT");
        }

        if (amount > MAX_AMOUNT) {
            throw new BankingClientException(
                    String.format("Amount exceeds maximum limit of %.2f", MAX_AMOUNT),
                    "AMOUNT_TOO_LARGE");
        }

        // Round to 2 decimal places
        return Math.round(amount * 100.0) / 100.0;
    }

    /**
     * Validate object using Bean Validation annotations
     * 
     * @param object Object to validate
     * @param <T>    Type of object
     * @throws BankingClientException If validation fails
     */
    public <T> void validate(T object) throws BankingClientException {
        Set<ConstraintViolation<T>> violations = validator.validate(object);

        if (!violations.isEmpty()) {
            var errorMessage = violations.stream()
                    .map(ConstraintViolation::getMessage)
                    .reduce((msg1, msg2) -> msg1 + "; " + msg2)
                    .orElse("Validation failed");

            throw new BankingClientException(errorMessage, "VALIDATION_ERROR");
        }
    }

    /**
     * Sanitize string input by removing potentially dangerous characters
     * 
     * @param input Input string
     * @return Sanitized string
     */
    public String sanitizeString(String input) {
        if (input == null) {
            return null;
        }

        return input.trim()
                .replaceAll("[<>\"'&]", "") // Remove potentially dangerous characters
                .substring(0, Math.min(input.length(), 500)); // Limit length
    }
}