package com.modernization.banking.model;

import java.time.Instant;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Transfer result record
 * 
 * Immutable data structure representing the result of a fund transfer
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TransferResult(
        @JsonProperty("transactionId") String transactionId,
        @JsonProperty("status") String status,
        @JsonProperty("message") String message,
        @JsonProperty("fromAccount") String fromAccount,
        @JsonProperty("toAccount") String toAccount,
        @JsonProperty("amount") Double amount,
        @JsonProperty("timestamp") Optional<Instant> timestamp) {
    public TransferResult(String transactionId, String status, String message,
            String fromAccount, String toAccount, Double amount) {
        this(transactionId, status, message, fromAccount, toAccount, amount, Optional.of(Instant.now()));
    }
}