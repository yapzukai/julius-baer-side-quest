package com.modernization.banking.auth;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.modernization.banking.config.BankingClientConfiguration;

/**
 * JWT Authentication manager with token caching
 * 
 * Handles token acquisition, caching, and validation
 */
public class AuthenticationManager {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationManager.class);

    private final BankingClientConfiguration configuration;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Map<String, TokenCacheEntry> tokenCache;
    private final Duration tokenExpiryBuffer = Duration.ofMinutes(5);

    public AuthenticationManager(BankingClientConfiguration configuration,
            HttpClient httpClient,
            ObjectMapper objectMapper) {
        this.configuration = configuration;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
        this.tokenCache = new ConcurrentHashMap<>();
    }

    /**
     * Obtain JWT token for the specified scope
     * 
     * @param scope Token scope (enquiry, transfer)
     * @return JWT token if successful
     */
    public Optional<String> obtainToken(String scope) {
        var cacheKey = scope;

        // Check cache first
        var cached = tokenCache.get(cacheKey);
        if (cached != null && Instant.now().isBefore(cached.expiry().minus(tokenExpiryBuffer))) {
            logger.debug("Using cached token for scope: {}", scope);
            return Optional.of(cached.token());
        }

        try {
            var authPayload = Map.of(
                    "username", "modern_client",
                    "password", "secure_password");

            var url = configuration.baseUrl() + "/authToken?claim=" + scope;

            var request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(configuration.requestTimeout()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(authPayload)))
                    .build();

            var response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                var responseData = objectMapper.readValue(response.body(), Map.class);
                var token = (String) responseData.get("token");

                if (token != null) {
                    // Cache token with 1 hour expiry
                    var expiry = Instant.now().plus(Duration.ofHours(1));
                    tokenCache.put(cacheKey, new TokenCacheEntry(token, expiry));

                    logger.info("Successfully obtained JWT token for scope: {}", scope);
                    return Optional.of(token);
                }
            }

            logger.error("Failed to obtain token: HTTP {}", response.statusCode());
            return Optional.empty();

        } catch (IOException | InterruptedException e) {
            logger.error("Error obtaining authentication token for scope: {}", scope, e);
            return Optional.empty();
        }
    }

    /**
     * Validate JWT token structure
     * 
     * @param token Token to validate
     * @return True if token has valid structure
     */
    public boolean validateTokenStructure(String token) {
        if (token == null || token.trim().isEmpty()) {
            return false;
        }

        var parts = token.split("\\.");
        return parts.length == 3;
    }

    /**
     * Clear token cache
     */
    public void clearTokenCache() {
        tokenCache.clear();
        logger.debug("Token cache cleared");
    }

    /**
     * Get cache statistics
     * 
     * @return Map with cache statistics
     */
    public Map<String, Object> getCacheStatistics() {
        return Map.of(
                "cachedTokens", tokenCache.size(),
                "scopes", tokenCache.keySet());
    }

    /**
     * Token cache entry record
     */
    private record TokenCacheEntry(String token, Instant expiry) {
    }
}