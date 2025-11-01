package com.modernization.banking;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.modernization.banking.client.ModernBankingClient;
import com.modernization.banking.config.BankingClientConfiguration;

/**
 * Modern Banking Client Application - Java 17+ Implementation
 * ===========================================================
 * 
 * A comprehensive banking client demonstrating enterprise-grade Java
 * development:
 * - Java 17+ features (records, pattern matching, text blocks, sealed classes)
 * - Modern HTTP client (java.net.http.HttpClient)
 * - Dependency injection and configuration management
 * - Professional logging with SLF4J and Logback
 * - JWT authentication with token caching
 * - Retry logic with exponential backoff
 * - Comprehensive error handling and validation
 * - Performance monitoring with Micrometer
 * - Modern CLI interface with PicoCLI
 * - Immutable data structures and functional programming
 * 
 * @author Modernization Demonstration
 * @version 1.0.0
 * @since Java 17
 */
public class BankingClientApplication {

    private static final Logger logger = LoggerFactory.getLogger(BankingClientApplication.class);

    /**
     * Application entry point
     * 
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        logger.info("Starting Modern Banking Client Application");

        try {
            // Check for demo flag
            if (args.length > 0 && "--demo".equals(args[0])) {
                runDemo();
                return;
            }

            // Default: show usage and run demo
            System.out.println("Modern Banking Client - Java 17+ Implementation");
            System.out.println("Usage: java -jar banking-client.jar [--demo]");
            System.out.println();
            System.out.println("Running demo...");
            runDemo();

        } catch (Exception e) {
            logger.error("Fatal application error", e);
            System.err.println("Fatal error: " + e.getMessage());
            System.exit(1);
        }
    }

    /**
     * Run comprehensive demo showcasing all features
     */
    public static void runDemo() {
        System.out.println("🏦 Modern Banking Client Demo - Java 17+ Implementation");
        System.out.println("=".repeat(60));

        try {
            var configuration = BankingClientConfiguration.defaultConfiguration();
            var client = new ModernBankingClient(configuration);

            // Demo 1: Account validation
            System.out.println("\n🔍 1. Account Validation Demo");
            var accounts = new String[] { "ACC1000", "ACC1001", "ACC2000", "INVALID" };

            for (var account : accounts) {
                try {
                    var result = client.validateAccount(account, false);
                    var status = result.isValid() ? "✅" : "❌";
                    System.out.printf("   %s %s: %s%n", status, account,
                            result.accountType().orElse("INVALID"));
                } catch (Exception e) {
                    System.out.printf("   ❌ %s: ERROR - %s%n", account, e.getMessage());
                }
            }

            // Demo 2: JWT Authentication
            System.out.println("\n🔐 2. JWT Authentication Demo");
            try {
                var token = client.getAuthenticationManager().obtainToken("transfer");
                if (token.isPresent()) {
                    System.out.println("   ✅ JWT Token obtained successfully");
                    System.out.printf("   Token preview: %s...%n", token.get().substring(0, 20));
                } else {
                    System.out.println("   ❌ JWT Token acquisition failed");
                }
            } catch (Exception e) {
                System.out.printf("   ❌ Authentication error: %s%n", e.getMessage());
            }

            // Demo 3: Transfer with validation
            System.out.println("\n💸 3. Transfer Demo");
            try {
                var transferRequest = ModernBankingClient.TransferRequest.builder()
                        .fromAccount("ACC1000")
                        .toAccount("ACC1001")
                        .amount(75.25)
                        .description("Demo transfer - Java 17+")
                        .build();

                var result = client.transferFunds(transferRequest, true);
                System.out.printf("   ✅ Transfer successful: %s%n", result.transactionId());
                System.out.printf("   Status: %s%n", result.status());
                System.out.printf("   Message: %s%n", result.message());

            } catch (Exception e) {
                System.out.printf("   ❌ Transfer failed: %s%n", e.getMessage());
            }

            // Demo 4: Performance metrics
            System.out.println("\n📊 4. Performance Statistics");
            var metrics = client.getPerformanceMetrics();
            System.out.printf("   Requests made: %d%n", metrics.totalRequests());
            System.out.printf("   Success rate: %.1f%%%n", metrics.successRate() * 100);
            System.out.printf("   Average response time: %.0f ms%n", metrics.averageResponseTime());

            // Demo 5: Health check
            System.out.println("\n💚 5. Health Check");
            var health = client.performHealthCheck();
            System.out.printf("   Server healthy: %s%n", health.isHealthy() ? "✅" : "❌");
            System.out.printf("   Response time: %d ms%n", health.responseTime());

            System.out.println("\n🎉 Demo completed successfully!");

        } catch (Exception e) {
            System.err.printf("\n❌ Demo failed: %s%n", e.getMessage());
            logger.error("Demo execution failed", e);
        }
    }
}