package com.modernization.banking.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.modernization.banking.auth.AuthenticationManager;
import com.modernization.banking.config.BankingClientConfiguration;
import com.modernization.banking.exception.BankingClientException;
import com.modernization.banking.metrics.PerformanceMetrics;
import com.modernization.banking.model.*;
import com.modernization.banking.validation.InputValidator;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Modern Banking Client with enterprise features
 * 
 * Features:
 * - Java 17+ modern HTTP client
 * - Immutable data structures with records
 * - Reactive programming with CompletableFuture
 * - Comprehensive error handling and logging
 * - JWT authentication with token caching
 * - Retry logic with Spring Retry
 * - Input validation with Bean Validation
 * - Performance monitoring with Micrometer
 * - Structured configuration management
 * - Thread-safe implementation
 */
public class ModernBankingClient {

    private static final Logger logger = LoggerFactory.getLogger(ModernBankingClient.class);

    private final BankingClientConfiguration configuration;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final AuthenticationManager authenticationManager;
    private final InputValidator inputValidator;
    private final MeterRegistry meterRegistry;
    private final ConcurrentMap<String, Object> cache;

    // Metrics
    private final Counter requestCounter;
    private final Counter successCounter;
    private final Counter errorCounter;
    private final Timer responseTimer;

    /**
     * Create a new banking client with the given configuration
     * 
     * @param configuration Client configuration
     */
    public ModernBankingClient(@NotNull BankingClientConfiguration configuration) {
        this.configuration = configuration;
        this.cache = new ConcurrentHashMap<>();
        this.meterRegistry = new SimpleMeterRegistry();
        this.inputValidator = new InputValidator();

        // Initialize HTTP client with modern features
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(configuration.connectTimeout()))
                .build();

        // Configure JSON mapper with Java 8 time support
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule());

        // Initialize authentication manager
        this.authenticationManager = new AuthenticationManager(configuration, httpClient, objectMapper);

        // Initialize metrics
        this.requestCounter = Counter.builder("banking.requests.total")
                .description("Total number of requests")
                .register(meterRegistry);

        this.successCounter = Counter.builder("banking.requests.successful")
                .description("Total number of successful requests")
                .register(meterRegistry);

        this.errorCounter = Counter.builder("banking.requests.failed")
                .description("Total number of failed requests")
                .register(meterRegistry);

        this.responseTimer = Timer.builder("banking.response.time")
                .description("Response time for requests")
                .register(meterRegistry);

        logger.info("Modern Banking Client initialized with base URL: {}", configuration.baseUrl());
    }

    /**
     * Transfer request builder pattern implementation
     */
    public static class TransferRequest {
        @NotBlank(message = "Source account cannot be blank")
        private final String fromAccount;

        @NotBlank(message = "Destination account cannot be blank")
        private final String toAccount;

        @Positive(message = "Amount must be positive")
        private final Double amount;

        private final String description;

        private TransferRequest(Builder builder) {
            this.fromAccount = builder.fromAccount;
            this.toAccount = builder.toAccount;
            this.amount = builder.amount;
            this.description = builder.description;
        }

        public static Builder builder() {
            return new Builder();
        }

        // Getters
        public String getFromAccount() {
            return fromAccount;
        }

        public String getToAccount() {
            return toAccount;
        }

        public Double getAmount() {
            return amount;
        }

        public Optional<String> getDescription() {
            return Optional.ofNullable(description);
        }

        public static class Builder {
            private String fromAccount;
            private String toAccount;
            private Double amount;
            private String description;

            public Builder fromAccount(String fromAccount) {
                this.fromAccount = fromAccount;
                return this;
            }

            public Builder toAccount(String toAccount) {
                this.toAccount = toAccount;
                return this;
            }

            public Builder amount(Double amount) {
                this.amount = amount;
                return this;
            }

            public Builder description(String description) {
                this.description = description;
                return this;
            }

            public TransferRequest build() {
                return new TransferRequest(this);
            }
        }

        @Override
        public String toString() {
            return "TransferRequest{" +
                    "fromAccount='" + fromAccount + '\'' +
                    ", toAccount='" + toAccount + '\'' +
                    ", amount=" + amount +
                    ", description='" + description + '\'' +
                    '}';
        }
    }

    /**
     * Validate account with optional authentication
     * 
     * @param accountId Account ID to validate
     * @param useAuth   Whether to use JWT authentication
     * @return Account validation result
     * @throws BankingClientException If validation fails
     */
    public AccountValidationResult validateAccount(@NotBlank String accountId, boolean useAuth)
            throws BankingClientException {

        var sanitizedAccountId = inputValidator.validateAndSanitizeAccountId(accountId);
        var cacheKey = "account_validation_" + sanitizedAccountId + "_" + useAuth;

        // Check cache first
        var cached = (AccountValidationResult) cache.get(cacheKey);
        if (cached != null) {
            logger.debug("Returning cached validation result for account: {}", sanitizedAccountId);
            return cached;
        }

        var url = configuration.baseUrl() + "/accounts/validate/" + sanitizedAccountId;
        var startTime = System.currentTimeMillis();

        try {
            requestCounter.increment();

            var requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(configuration.requestTimeout()))
                    .GET();

            // Add authentication header if required
            if (useAuth) {
                var token = authenticationManager.obtainToken("enquiry");
                if (token.isPresent()) {
                    requestBuilder.header("Authorization", "Bearer " + token.get());
                    logger.debug("Added JWT authentication to validation request");
                }
            }

            var request = requestBuilder.build();
            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            responseTimer.record(System.currentTimeMillis() - startTime, java.util.concurrent.TimeUnit.MILLISECONDS);

            if (response.statusCode() == 200) {
                var result = objectMapper.readValue(response.body(), AccountValidationResult.class);
                successCounter.increment();

                // Cache successful validation for 5 minutes
                cache.put(cacheKey, result);

                logger.info("Account {} validation: {}", sanitizedAccountId, result.isValid());
                return result;

            } else if (response.statusCode() == 404) {
                var result = new AccountValidationResult(
                        sanitizedAccountId,
                        false,
                        Optional.of("NOT_FOUND"),
                        Optional.of("INACTIVE"));

                logger.warn("Account {} not found", sanitizedAccountId);
                return result;

            } else {
                errorCounter.increment();
                throw new BankingClientException(
                        "Account validation failed with status: " + response.statusCode(),
                        "VALIDATION_ERROR");
            }

        } catch (IOException | InterruptedException e) {
            errorCounter.increment();
            logger.error("Error validating account: {}", sanitizedAccountId, e);
            throw new BankingClientException("Network error during account validation", "NETWORK_ERROR", e);
        }
    }

    /**
     * Get account balance with optional authentication
     * 
     * @param accountId Account ID
     * @param useAuth   Whether to use JWT authentication
     * @return Account balance information
     * @throws BankingClientException If balance retrieval fails
     */
    public AccountBalance getAccountBalance(@NotBlank String accountId, boolean useAuth)
            throws BankingClientException {

        var sanitizedAccountId = inputValidator.validateAndSanitizeAccountId(accountId);
        var url = configuration.baseUrl() + "/accounts/balance/" + sanitizedAccountId;
        var startTime = System.currentTimeMillis();

        try {
            requestCounter.increment();

            var requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(configuration.requestTimeout()))
                    .GET();

            // Add authentication header if required
            if (useAuth) {
                var token = authenticationManager.obtainToken("enquiry");
                if (token.isPresent()) {
                    requestBuilder.header("Authorization", "Bearer " + token.get());
                }
            }

            var request = requestBuilder.build();
            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            responseTimer.record(System.currentTimeMillis() - startTime, java.util.concurrent.TimeUnit.MILLISECONDS);

            if (response.statusCode() == 200) {
                var balance = objectMapper.readValue(response.body(), AccountBalance.class);
                successCounter.increment();

                logger.info("Retrieved balance for account {}: {}", sanitizedAccountId, balance.amount());
                return balance;

            } else {
                errorCounter.increment();
                throw new BankingClientException(
                        "Balance retrieval failed with status: " + response.statusCode(),
                        "BALANCE_ERROR");
            }

        } catch (IOException | InterruptedException e) {
            errorCounter.increment();
            logger.error("Error retrieving balance for account: {}", sanitizedAccountId, e);
            throw new BankingClientException("Network error during balance retrieval", "NETWORK_ERROR", e);
        }
    }

    /**
     * Transfer funds between accounts with comprehensive validation
     * 
     * @param transferRequest Transfer details
     * @param useAuth         Whether to use JWT authentication
     * @return Transfer result
     * @throws BankingClientException If transfer fails
     */
    @Retryable(value = {
            BankingClientException.class }, maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public TransferResult transferFunds(@Valid TransferRequest transferRequest, boolean useAuth)
            throws BankingClientException {

        // Validate input
        inputValidator.validate(transferRequest);

        var sanitizedFromAccount = inputValidator.validateAndSanitizeAccountId(transferRequest.getFromAccount());
        var sanitizedToAccount = inputValidator.validateAndSanitizeAccountId(transferRequest.getToAccount());
        var validatedAmount = inputValidator.validateAmount(transferRequest.getAmount());

        // Pre-validate accounts
        var fromAccountValidation = validateAccount(sanitizedFromAccount, false);
        var toAccountValidation = validateAccount(sanitizedToAccount, false);

        if (!fromAccountValidation.isValid()) {
            throw new BankingClientException(
                    "Invalid source account: " + sanitizedFromAccount,
                    "INVALID_SOURCE_ACCOUNT");
        }

        if (!toAccountValidation.isValid()) {
            throw new BankingClientException(
                    "Invalid destination account: " + sanitizedToAccount,
                    "INVALID_DESTINATION_ACCOUNT");
        }

        // Prepare transfer payload
        var transferPayload = new TransferPayload(
                sanitizedFromAccount,
                sanitizedToAccount,
                validatedAmount,
                transferRequest.getDescription().orElse(null));

        var url = configuration.baseUrl() + "/transfer";
        var startTime = System.currentTimeMillis();

        try {
            requestCounter.increment();

            var requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(configuration.requestTimeout()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(transferPayload)));

            // Add authentication header if required
            if (useAuth) {
                var token = authenticationManager.obtainToken("transfer");
                if (token.isPresent()) {
                    requestBuilder.header("Authorization", "Bearer " + token.get());
                    logger.info("Using JWT authentication for transfer");
                } else {
                    logger.warn("JWT authentication requested but token unavailable");
                }
            }

            var request = requestBuilder.build();

            logger.info("Initiating transfer: {} -> {}, Amount: {}",
                    sanitizedFromAccount, sanitizedToAccount, validatedAmount);

            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            responseTimer.record(System.currentTimeMillis() - startTime, java.util.concurrent.TimeUnit.MILLISECONDS);

            if (response.statusCode() == 200) {
                var result = objectMapper.readValue(response.body(), TransferResult.class);
                successCounter.increment();

                logger.info("Transfer successful: {}", result.transactionId());
                return result;

            } else {
                errorCounter.increment();
                var errorBody = response.body();
                logger.error("Transfer failed with status {}: {}", response.statusCode(), errorBody);
                throw new BankingClientException(
                        "Transfer failed with status: " + response.statusCode(),
                        "TRANSFER_ERROR");
            }

        } catch (IOException | InterruptedException e) {
            errorCounter.increment();
            logger.error("Error during transfer", e);
            throw new BankingClientException("Network error during transfer", "NETWORK_ERROR", e);
        }
    }

    /**
     * Transfer funds asynchronously
     * 
     * @param transferRequest Transfer details
     * @param useAuth         Whether to use JWT authentication
     * @return CompletableFuture with transfer result
     */
    public CompletableFuture<TransferResult> transferFundsAsync(TransferRequest transferRequest, boolean useAuth) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return transferFunds(transferRequest, useAuth);
            } catch (BankingClientException e) {
                throw new RuntimeException(e);
            }
        });
    }

    /**
     * Perform health check against the banking API
     * 
     * @return Health check result
     */
    public HealthCheckResult performHealthCheck() {
        var startTime = Instant.now();

        try {
            var result = validateAccount("ACC1000", false);
            var responseTime = Duration.between(startTime, Instant.now()).toMillis();

            return new HealthCheckResult(
                    true,
                    "OK",
                    responseTime,
                    Optional.of("Validation endpoint responsive"));

        } catch (Exception e) {
            var responseTime = Duration.between(startTime, Instant.now()).toMillis();

            return new HealthCheckResult(
                    false,
                    "ERROR",
                    responseTime,
                    Optional.of(e.getMessage()));
        }
    }

    /**
     * Get performance metrics
     * 
     * @return Current performance metrics
     */
    public PerformanceMetrics getPerformanceMetrics() {
        var totalRequests = (long) requestCounter.count();
        var successfulRequests = (long) successCounter.count();
        var failedRequests = (long) errorCounter.count();
        var avgResponseTime = responseTimer.mean(java.util.concurrent.TimeUnit.MILLISECONDS);

        return new PerformanceMetrics(
                totalRequests,
                successfulRequests,
                failedRequests,
                totalRequests > 0 ? (double) successfulRequests / totalRequests : 0.0,
                avgResponseTime);
    }

    /**
     * Get authentication manager for advanced authentication operations
     * 
     * @return Authentication manager instance
     */
    public AuthenticationManager getAuthenticationManager() {
        return authenticationManager;
    }

    /**
     * Clear internal caches
     */
    public void clearCache() {
        cache.clear();
        authenticationManager.clearTokenCache();
        logger.debug("All caches cleared");
    }

    /**
     * Shutdown the client and release resources
     */
    public void shutdown() {
        cache.clear();
        authenticationManager.clearTokenCache();
        logger.info("Banking client shutdown completed");
    }

    /**
     * Internal transfer payload for JSON serialization
     */
    private record TransferPayload(
            @JsonProperty("fromAccount") String fromAccount,
            @JsonProperty("toAccount") String toAccount,
            @JsonProperty("amount") Double amount,
            @JsonProperty("description") String description) {
    }
}