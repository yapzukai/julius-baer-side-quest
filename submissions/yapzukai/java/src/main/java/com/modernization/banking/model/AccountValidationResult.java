package com.modernization.banking.model;

import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Account validation result record
 * 
 * Immutable data structure representing the result of account validation
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AccountValidationResult(
        @JsonProperty("accountId") String accountId,
        @JsonProperty("isValid") boolean isValid,
        @JsonProperty("accountType") Optional<String> accountType,
        @JsonProperty("status") Optional<String> status) {
    public AccountValidationResult(String accountId, boolean isValid, String accountType, String status) {
        this(accountId, isValid, Optional.ofNullable(accountType), Optional.ofNullable(status));
    }
}