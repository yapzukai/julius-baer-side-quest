package com.modernization.banking.cli;

import java.math.BigDecimal;
import java.util.concurrent.Callable;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.modernization.banking.client.ModernBankingClient;
import com.modernization.banking.config.BankingClientConfiguration;
import com.modernization.banking.exception.BankingClientException;

import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;

/**
 * Modern CLI interface for the Banking Client using PicoCLI
 * 
 * Provides a comprehensive command-line interface with:
 * - Account validation
 * - Fund transfers
 * - Authentication management
 * - Health checks
 * - Performance monitoring
 * 
 * @author Modernization Team
 * @version 1.0.0
 */
@Command(name = "banking-client", description = "Modern Banking Client - Java 17+ Implementation", mixinStandardHelpOptions = true, version = "1.0.0", showDefaultValues = true, sortOptions = false)
public class BankingClientCommand implements Callable<Integer> {

    private static final Logger logger = LoggerFactory.getLogger(BankingClientCommand.class);

    private final BankingClientConfiguration configuration;
    private ModernBankingClient client;

    @Option(names = { "-u", "--url" }, description = "Banking API base URL")
    private String apiUrl;

    @Option(names = { "-v", "--verbose" }, description = "Enable verbose logging")
    private boolean verbose;

    @Option(names = { "--demo" }, description = "Run comprehensive demo")
    private boolean runDemo;

    @CommandLine.ArgGroup(exclusive = true, multiplicity = "0..1")
    private OperationGroup operation;

    public BankingClientCommand(BankingClientConfiguration configuration) {
        this.configuration = configuration;
    }

    @Override
    public Integer call() throws Exception {
        try {
            // Initialize client
            var config = apiUrl != null ? new BankingClientConfiguration(
                    apiUrl,
                    configuration.connectTimeout(),
                    configuration.requestTimeout(),
                    configuration.maxRetries(),
                    configuration.retryDelayMs(),
                    configuration.jwtSecret(),
                    configuration.logLevel(),
                    configuration.enableMetrics(),
                    configuration.enableCaching()) : configuration;

            this.client = new ModernBankingClient(config);
            if (runDemo) {
                return runComprehensiveDemo();
            }

            if (operation != null) {
                return operation.execute(client);
            }

            // Default: show help
            CommandLine.usage(this, System.out);
            return 0;

        } catch (BankingClientException e) {
            System.err.println("Banking operation failed: " + e.getMessage());
            if (verbose) {
                e.printStackTrace();
            }
            return 1;
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            if (verbose) {
                e.printStackTrace();
            }
            logger.error("CLI execution failed", e);
            return 2;
        }
    }

    private int runComprehensiveDemo() {
        System.out.println("🏦 Modern Banking Client Demo - Java 17+");
        System.out.println("=".repeat(50));

        try {
            // Account validation demo
            System.out.println("\n🔍 Account Validation:");
            var accounts = new String[] { "ACC1000", "ACC1001", "ACC2000" };
            for (var account : accounts) {
                var result = client.validateAccount(account, false);
                System.out.printf("   %s: %s%n", account,
                        result.isValid() ? "✅ Valid" : "❌ Invalid");
            }

            // Health check
            System.out.println("\n💚 Health Check:");
            var health = client.performHealthCheck();
            System.out.printf("   Status: %s%n",
                    health.isHealthy() ? "✅ Healthy" : "❌ Unhealthy");

            // Performance metrics
            System.out.println("\n📊 Performance:");
            var metrics = client.getPerformanceMetrics();
            System.out.printf("   Requests: %d%n", metrics.totalRequests());
            System.out.printf("   Success rate: %.1f%%%n", metrics.successRate() * 100);

            System.out.println("\n🎉 Demo completed successfully!");
            return 0;

        } catch (Exception e) {
            System.err.println("Demo failed: " + e.getMessage());
            return 1;
        }
    }

    /**
     * Operation group for mutually exclusive operations
     */
    static class OperationGroup {
        @CommandLine.ArgGroup(exclusive = false)
        ValidateOperation validate;

        @CommandLine.ArgGroup(exclusive = false)
        TransferOperation transfer;

        @CommandLine.ArgGroup(exclusive = false)
        HealthOperation health;

        @CommandLine.ArgGroup(exclusive = false)
        AuthOperation auth;

        public int execute(ModernBankingClient client) throws Exception {
            if (validate != null) {
                return validate.execute(client);
            }
            if (transfer != null) {
                return transfer.execute(client);
            }
            if (health != null) {
                return health.execute(client);
            }
            if (auth != null) {
                return auth.execute(client);
            }
            return 0;
        }
    }

    /**
     * Account validation operation
     */
    static class ValidateOperation {
        @Parameters(index = "0", description = "Account number to validate")
        String accountNumber;

        @Option(names = { "--validate" }, description = "Validate account", required = true)
        boolean validate;

        public int execute(ModernBankingClient client) throws Exception {
            var result = client.validateAccount(accountNumber, false);
            System.out.printf("Account %s: %s%n", accountNumber,
                    result.isValid() ? "✅ Valid" : "❌ Invalid");
            if (result.accountType().isPresent()) {
                System.out.printf("Type: %s%n", result.accountType().get());
            }
            return 0;
        }
    }

    /**
     * Fund transfer operation
     */
    static class TransferOperation {
        @Option(names = { "--transfer" }, description = "Perform transfer", required = true)
        boolean transfer;

        @Option(names = { "--from" }, description = "Source account", required = true)
        String fromAccount;

        @Option(names = { "--to" }, description = "Destination account", required = true)
        String toAccount;

        @Option(names = { "--amount" }, description = "Transfer amount", required = true)
        BigDecimal amount;

        @Option(names = { "--description" }, description = "Transfer description")
        String description = "CLI Transfer";

        public int execute(ModernBankingClient client) throws Exception {
            var request = ModernBankingClient.TransferRequest.builder()
                    .fromAccount(fromAccount)
                    .toAccount(toAccount)
                    .amount(amount.doubleValue())
                    .description(description)
                    .build();

            var result = client.transferFunds(request, true);
            System.out.printf("✅ Transfer successful: %s%n", result.transactionId());
            System.out.printf("Status: %s%n", result.status());
            return 0;
        }
    }

    /**
     * Health check operation
     */
    static class HealthOperation {
        @Option(names = { "--health" }, description = "Check service health", required = true)
        boolean health;

        public int execute(ModernBankingClient client) throws Exception {
            var result = client.performHealthCheck();
            System.out.printf("Health: %s%n",
                    result.isHealthy() ? "✅ Healthy" : "❌ Unhealthy");
            System.out.printf("Response time: %d ms%n", result.responseTime());
            return 0;
        }
    }

    /**
     * Authentication operation
     */
    static class AuthOperation {
        @Option(names = { "--auth" }, description = "Test authentication", required = true)
        boolean auth;

        public int execute(ModernBankingClient client) throws Exception {
            var token = client.getAuthenticationManager().obtainToken("test");
            if (token.isPresent()) {
                System.out.println("✅ Authentication successful");
                System.out.printf("Token: %s...%n", token.get().substring(0, 20));
            } else {
                System.out.println("❌ Authentication failed");
                return 1;
            }
            return 0;
        }
    }
}