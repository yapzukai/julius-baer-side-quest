package com.modernization.banking.model;

import java.util.Optional;

/**
 * Health check result record
 */
public record HealthCheckResult(
        boolean isHealthy,
        String status,
        long responseTime,
        Optional<String> message) {
    public HealthCheckResult(boolean isHealthy, String status, long responseTime, String message) {
        this(isHealthy, status, responseTime, Optional.ofNullable(message));
    }
}