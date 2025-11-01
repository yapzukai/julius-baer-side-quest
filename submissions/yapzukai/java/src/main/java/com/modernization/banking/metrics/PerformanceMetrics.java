package com.modernization.banking.metrics;

/**
 * Performance metrics record
 * 
 * Immutable data structure for tracking client performance
 */
public record PerformanceMetrics(
        long totalRequests,
        long successfulRequests,
        long failedRequests,
        double successRate,
        double averageResponseTime) {
    public PerformanceMetrics {
        if (totalRequests < 0 || successfulRequests < 0 || failedRequests < 0) {
            throw new IllegalArgumentException("Request counts cannot be negative");
        }
        if (successRate < 0.0 || successRate > 1.0) {
            throw new IllegalArgumentException("Success rate must be between 0.0 and 1.0");
        }
        if (averageResponseTime < 0.0) {
            throw new IllegalArgumentException("Average response time cannot be negative");
        }
    }
}