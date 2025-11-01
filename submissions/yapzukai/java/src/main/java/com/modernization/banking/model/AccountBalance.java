package com.modernization.banking.model;

import java.time.Instant;
import java.util.Optional;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Account balance information record
 * 
 * Immutable data structure representing account balance details
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AccountBalance(
        @JsonProperty("accountId") String accountId,
        @JsonProperty("balance") Double amount,
        @JsonProperty("currency") String currency,
        @JsonProperty("lastUpdated") Optional<Instant> lastUpdated) {
    public AccountBalance(String accountId, Double amount, String currency) {
        this(accountId, amount, currency, Optional.empty());
    }
}