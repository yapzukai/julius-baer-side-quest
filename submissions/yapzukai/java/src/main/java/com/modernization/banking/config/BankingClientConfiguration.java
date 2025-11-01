package com.modernization.banking.config;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Immutable configuration record for banking client
 * 
 * Uses Java 17+ records for immutable data structures
 * Includes validation annotations for configuration validation
 */
public record BankingClientConfiguration(
        @NotBlank(message = "Base URL cannot be blank") @Pattern(regexp = "https?://.*", message = "Base URL must be a valid HTTP/HTTPS URL") String baseUrl,

        @Min(value = 1, message = "Connect timeout must be at least 1 second") @Max(value = 300, message = "Connect timeout cannot exceed 300 seconds") int connectTimeout,

        @Min(value = 1, message = "Request timeout must be at least 1 second") @Max(value = 300, message = "Request timeout cannot exceed 300 seconds") int requestTimeout,

        @Min(value = 0, message = "Max retries cannot be negative") @Max(value = 10, message = "Max retries cannot exceed 10") int maxRetries,

        @Min(value = 100, message = "Retry delay must be at least 100ms") @Max(value = 30000, message = "Retry delay cannot exceed 30 seconds") long retryDelayMs,

        @NotBlank(message = "JWT secret cannot be blank") String jwtSecret,

        @Pattern(regexp = "DEBUG|INFO|WARN|ERROR", message = "Log level must be DEBUG, INFO, WARN, or ERROR") String logLevel,

        boolean enableMetrics,
        boolean enableCaching) {

    /**
     * Create default configuration for development
     */
    public static BankingClientConfiguration defaultConfiguration() {
        return new BankingClientConfiguration(
                "http://localhost:8123",
                30,
                30,
                3,
                1000L,
                "modern_banking_secret",
                "INFO",
                true,
                true);
    }

    /**
     * Create production configuration
     */
    public static BankingClientConfiguration productionConfiguration(String baseUrl) {
        return new BankingClientConfiguration(
                baseUrl,
                15,
                60,
                5,
                2000L,
                System.getenv("JWT_SECRET") != null ? System.getenv("JWT_SECRET") : "change_me_in_production",
                "WARN",
                true,
                true);
    }

    /**
     * Builder for flexible configuration creation
     */
    public static class Builder {
        private String baseUrl = "http://localhost:8123";
        private int connectTimeout = 30;
        private int requestTimeout = 30;
        private int maxRetries = 3;
        private long retryDelayMs = 1000L;
        private String jwtSecret = "modern_banking_secret";
        private String logLevel = "INFO";
        private boolean enableMetrics = true;
        private boolean enableCaching = true;

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder connectTimeout(int connectTimeout) {
            this.connectTimeout = connectTimeout;
            return this;
        }

        public Builder requestTimeout(int requestTimeout) {
            this.requestTimeout = requestTimeout;
            return this;
        }

        public Builder maxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
            return this;
        }

        public Builder retryDelayMs(long retryDelayMs) {
            this.retryDelayMs = retryDelayMs;
            return this;
        }

        public Builder jwtSecret(String jwtSecret) {
            this.jwtSecret = jwtSecret;
            return this;
        }

        public Builder logLevel(String logLevel) {
            this.logLevel = logLevel;
            return this;
        }

        public Builder enableMetrics(boolean enableMetrics) {
            this.enableMetrics = enableMetrics;
            return this;
        }

        public Builder enableCaching(boolean enableCaching) {
            this.enableCaching = enableCaching;
            return this;
        }

        public BankingClientConfiguration build() {
            return new BankingClientConfiguration(
                    baseUrl, connectTimeout, requestTimeout, maxRetries,
                    retryDelayMs, jwtSecret, logLevel, enableMetrics, enableCaching);
        }
    }

    public static Builder builder() {
        return new Builder();
    }
}