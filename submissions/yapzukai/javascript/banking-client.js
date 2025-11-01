/**
 * Modern Banking Client - Comprehensive ES2023+ Implementation
 * ============================================================
 * 
 * A fully modernized banking client demonstrating enterprise-grade JavaScript development:
 * - ES2023+ syntax with modern features
 * - Async/await patterns with fetch API
 * - Module system (ES6 imports/exports)
 * - TypeScript-style JSDoc comments
 * - Professional error handling and logging
 * - JWT authentication with token management
 * - Retry logic with exponential backoff
 * - Input validation and sanitization
 * - Performance monitoring and metrics
 * - Modern browser and Node.js compatibility
 * 
 * @author Modernization Demonstration
 * @version 1.0.0
 * @requires ES2023+, fetch API, Node.js 18+ (for Node.js usage)
 */

// Modern ES6+ imports
import { createHash, randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

/**
 * @typedef {Object} BankingConfig
 * @property {string} baseUrl - Banking API base URL
 * @property {number} timeout - Request timeout in milliseconds
 * @property {number} maxRetries - Maximum retry attempts
 * @property {number} retryDelay - Base retry delay in milliseconds
 * @property {string} jwtSecret - JWT secret for validation
 * @property {string} logLevel - Logging level
 */

/**
 * @typedef {Object} TransferRequest
 * @property {string} fromAccount - Source account ID
 * @property {string} toAccount - Destination account ID
 * @property {number} amount - Transfer amount
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} TransferResponse
 * @property {string} transactionId - Transaction ID
 * @property {string} status - Transfer status
 * @property {string} message - Status message
 * @property {string} fromAccount - Source account
 * @property {string} toAccount - Destination account
 * @property {number} amount - Transfer amount
 * @property {Date} timestamp - Transaction timestamp
 */

/**
 * Configuration manager with validation and defaults
 */
class BankingConfig {
    /**
     * Create a new banking configuration
     * @param {Partial<BankingConfig>} options - Configuration options
     */
    constructor(options = {}) {
        this.baseUrl = this.#validateUrl(options.baseUrl ?? 'http://localhost:8123');
        this.timeout = this.#validateNumber(options.timeout ?? 30000, 1000, 300000);
        this.maxRetries = this.#validateNumber(options.maxRetries ?? 3, 0, 10);
        this.retryDelay = this.#validateNumber(options.retryDelay ?? 1000, 100, 10000);
        this.jwtSecret = options.jwtSecret ?? 'modern_banking_secret';
        this.logLevel = options.logLevel ?? 'INFO';
        
        // Freeze configuration to prevent modifications
        Object.freeze(this);
    }
    
    /**
     * Validate URL format
     * @private
     */
    #validateUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('baseUrl must be a non-empty string');
        }
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            throw new Error('baseUrl must start with http:// or https://');
        }
        
        return url.replace(/\/$/, ''); // Remove trailing slash
    }
    
    /**
     * Validate numeric values with range checking
     * @private
     */
    #validateNumber(value, min, max) {
        const num = Number(value);
        if (isNaN(num) || num < min || num > max) {
            throw new Error(`Value must be a number between ${min} and ${max}`);
        }
        return num;
    }
}

/**
 * Modern logging utility with structured output
 */
class Logger {
    constructor(level = 'INFO') {
        this.levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
        this.currentLevel = this.levels[level.toUpperCase()] ?? this.levels.INFO;
    }
    
    /**
     * Create structured log entry
     * @private
     */
    #createLogEntry(level, message, metadata = {}) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            metadata,
            source: 'BankingClient'
        };
    }
    
    /**
     * Output log entry to console with color coding
     * @private
     */
    #output(entry) {
        const colors = {
            DEBUG: '\x1b[36m', // Cyan
            INFO: '\x1b[32m',  // Green
            WARN: '\x1b[33m',  // Yellow
            ERROR: '\x1b[31m'  // Red
        };
        
        const reset = '\x1b[0m';
        const color = colors[entry.level] || '';
        
        const formattedMessage = `${color}[${entry.timestamp}] ${entry.level}: ${entry.message}${reset}`;
        
        if (Object.keys(entry.metadata).length > 0) {
            console.log(formattedMessage, entry.metadata);
        } else {
            console.log(formattedMessage);
        }
    }
    
    debug(message, metadata) {
        if (this.currentLevel <= this.levels.DEBUG) {
            this.#output(this.#createLogEntry('DEBUG', message, metadata));
        }
    }
    
    info(message, metadata) {
        if (this.currentLevel <= this.levels.INFO) {
            this.#output(this.#createLogEntry('INFO', message, metadata));
        }
    }
    
    warn(message, metadata) {
        if (this.currentLevel <= this.levels.WARN) {
            this.#output(this.#createLogEntry('WARN', message, metadata));
        }
    }
    
    error(message, metadata) {
        if (this.currentLevel <= this.levels.ERROR) {
            this.#output(this.#createLogEntry('ERROR', message, metadata));
        }
    }
}

/**
 * Custom error class for banking operations
 */
class BankingClientError extends Error {
    constructor(message, code = 'BANKING_ERROR', details = {}) {
        super(message);
        this.name = 'BankingClientError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Input validation and sanitization utilities
 */
class ValidationUtils {
    /**
     * Validate and sanitize account ID
     * @param {string} accountId - Account ID to validate
     * @returns {string} Sanitized account ID
     */
    static validateAccountId(accountId) {
        if (!accountId || typeof accountId !== 'string') {
            throw new BankingClientError('Account ID must be a non-empty string', 'INVALID_ACCOUNT');
        }
        
        const sanitized = accountId.trim().toUpperCase();
        
        if (!/^[A-Z0-9]+$/.test(sanitized)) {
            throw new BankingClientError('Account ID contains invalid characters', 'INVALID_ACCOUNT');
        }
        
        return sanitized;
    }
    
    /**
     * Validate transfer amount
     * @param {number|string} amount - Amount to validate
     * @returns {number} Validated amount
     */
    static validateAmount(amount) {
        const num = Number(amount);
        
        if (isNaN(num) || num <= 0) {
            throw new BankingClientError('Amount must be a positive number', 'INVALID_AMOUNT');
        }
        
        if (num > 1_000_000) {
            throw new BankingClientError('Amount exceeds maximum limit', 'AMOUNT_TOO_LARGE');
        }
        
        // Round to 2 decimal places
        return Math.round(num * 100) / 100;
    }
    
    /**
     * Sanitize string input
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized string
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
            .substring(0, 500); // Limit length
    }
}

/**
 * JWT Authentication manager with token caching and validation
 */
class AuthenticationManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.tokenCache = new Map();
        this.tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
    }
    
    /**
     * Get JWT token with caching and automatic refresh
     * @param {string} scope - Token scope (enquiry, transfer)
     * @returns {Promise<string|null>} JWT token or null if failed
     */
    async getToken(scope = 'transfer') {
        // Check cache first
        const cached = this.tokenCache.get(scope);
        if (cached && Date.now() < cached.expiry - this.tokenExpiryBuffer) {
            this.logger.debug(`Using cached token for scope: ${scope}`);
            return cached.token;
        }
        
        try {
            const authPayload = {
                username: 'modern_client',
                password: 'secure_password'
            };
            
            const url = `${this.config.baseUrl}/authToken?claim=${encodeURIComponent(scope)}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'ModernBankingClient/1.0'
                },
                body: JSON.stringify(authPayload),
                signal: AbortSignal.timeout(this.config.timeout)
            });
            
            if (response.ok) {
                const tokenData = await response.json();
                const token = tokenData.token;
                
                if (token) {
                    // Cache token with 1 hour expiry
                    const expiry = Date.now() + (60 * 60 * 1000);
                    this.tokenCache.set(scope, { token, expiry });
                    
                    this.logger.info(`Successfully obtained JWT token for scope: ${scope}`);
                    return token;
                }
            }
            
            this.logger.error(`Failed to obtain token: ${response.status}`);
            return null;
            
        } catch (error) {
            this.logger.error('Error obtaining authentication token', { error: error.message });
            return null;
        }
    }
    
    /**
     * Validate JWT token structure
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid structure
     */
    validateTokenStructure(token) {
        try {
            return typeof token === 'string' && token.split('.').length === 3;
        } catch {
            return false;
        }
    }
    
    /**
     * Clear token cache
     */
    clearCache() {
        this.tokenCache.clear();
        this.logger.debug('Token cache cleared');
    }
}

/**
 * Performance monitoring and metrics collection
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requestCount: 0,
            successCount: 0,
            errorCount: 0,
            totalResponseTime: 0,
            startTime: performance.now()
        };
    }
    
    /**
     * Record request start
     * @returns {number} Request start time
     */
    recordRequestStart() {
        this.metrics.requestCount++;
        return performance.now();
    }
    
    /**
     * Record request completion
     * @param {number} startTime - Request start time
     * @param {boolean} success - Whether request was successful
     */
    recordRequestEnd(startTime, success = true) {
        const duration = performance.now() - startTime;
        this.metrics.totalResponseTime += duration;
        
        if (success) {
            this.metrics.successCount++;
        } else {
            this.metrics.errorCount++;
        }
    }
    
    /**
     * Get performance statistics
     * @returns {Object} Performance metrics
     */
    getStats() {
        const uptime = performance.now() - this.metrics.startTime;
        const avgResponseTime = this.metrics.requestCount > 0 
            ? this.metrics.totalResponseTime / this.metrics.requestCount 
            : 0;
        
        return {
            uptime: Math.round(uptime),
            requestCount: this.metrics.requestCount,
            successCount: this.metrics.successCount,
            errorCount: this.metrics.errorCount,
            successRate: this.metrics.requestCount > 0 
                ? Math.round((this.metrics.successCount / this.metrics.requestCount) * 100) 
                : 0,
            averageResponseTime: Math.round(avgResponseTime),
            requestsPerSecond: uptime > 0 
                ? Math.round((this.metrics.requestCount / uptime) * 1000) 
                : 0
        };
    }
}

/**
 * Modern Banking Client with enterprise features
 * 
 * Features:
 * - Modern ES2023+ syntax and patterns
 * - Async/await with fetch API
 * - Automatic retry with exponential backoff
 * - JWT authentication with token caching
 * - Comprehensive error handling and logging
 * - Input validation and sanitization
 * - Performance monitoring and metrics
 * - AbortController for request cancellation
 * - Memory-efficient caching strategies
 */
class ModernBankingClient {
    /**
     * Create a new banking client
     * @param {BankingConfig} config - Client configuration
     */
    constructor(config = new BankingConfig()) {
        this.config = config;
        this.logger = new Logger(config.logLevel);
        this.authManager = new AuthenticationManager(config, this.logger);
        this.performanceMonitor = new PerformanceMonitor();
        
        this.logger.info('Modern Banking Client initialized', {
            baseUrl: config.baseUrl,
            timeout: config.timeout,
            maxRetries: config.maxRetries
        });
    }
    
    /**
     * Make HTTP request with retry logic and exponential backoff
     * @private
     * @param {string} url - Request URL
     * @param {RequestInit} options - Fetch options
     * @returns {Promise<Response>} Response object
     */
    async #makeRequestWithRetry(url, options = {}) {
        const startTime = this.performanceMonitor.recordRequestStart();
        
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                // Add timeout to all requests
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
                
                const requestOptions = {
                    ...options,
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'ModernBankingClient/1.0',
                        ...options.headers
                    }
                };
                
                this.logger.debug(`Making ${options.method || 'GET'} request to ${url}`, {
                    attempt: attempt + 1,
                    maxRetries: this.config.maxRetries + 1
                });
                
                const response = await fetch(url, requestOptions);
                clearTimeout(timeoutId);
                
                // Don't retry client errors (4xx)
                if (response.status < 500) {
                    this.performanceMonitor.recordRequestEnd(startTime, response.ok);
                    return response;
                }
                
                // Server error - retry if attempts remaining
                if (attempt === this.config.maxRetries) {
                    this.performanceMonitor.recordRequestEnd(startTime, false);
                    throw new BankingClientError(
                        `Server error: ${response.status}`,
                        'SERVER_ERROR',
                        { status: response.status, attempt: attempt + 1 }
                    );
                }
                
                // Exponential backoff
                const delay = this.config.retryDelay * Math.pow(2, attempt);
                this.logger.warn(`Server error ${response.status}, retrying in ${delay}ms`, {
                    attempt: attempt + 1,
                    delay
                });
                
                await this.#sleep(delay);
                
            } catch (error) {
                this.performanceMonitor.recordRequestEnd(startTime, false);
                
                if (error.name === 'AbortError') {
                    throw new BankingClientError(
                        'Request timeout',
                        'TIMEOUT',
                        { timeout: this.config.timeout }
                    );
                }
                
                if (attempt === this.config.maxRetries) {
                    throw new BankingClientError(
                        `Network error: ${error.message}`,
                        'NETWORK_ERROR',
                        { originalError: error.message }
                    );
                }
                
                const delay = this.config.retryDelay * Math.pow(2, attempt);
                this.logger.warn(`Network error, retrying in ${delay}ms`, { error: error.message });
                await this.#sleep(delay);
            }
        }
    }
    
    /**
     * Sleep utility for delays
     * @private
     */
    async #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Validate account with optional authentication
     * @param {string} accountId - Account ID to validate
     * @param {boolean} useAuth - Whether to use JWT authentication
     * @returns {Promise<Object>} Account information
     */
    async validateAccount(accountId, useAuth = false) {
        const sanitizedAccountId = ValidationUtils.validateAccountId(accountId);
        const url = `${this.config.baseUrl}/accounts/validate/${sanitizedAccountId}`;
        
        const headers = {};
        if (useAuth) {
            const token = await this.authManager.getToken('enquiry');
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }
        
        try {
            const response = await this.#makeRequestWithRetry(url, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const accountInfo = await response.json();
                this.logger.info(`Account ${sanitizedAccountId} validation`, {
                    isValid: accountInfo.isValid,
                    accountType: accountInfo.accountType
                });
                return accountInfo;
            } else if (response.status === 404) {
                this.logger.warn(`Account ${sanitizedAccountId} not found`);
                return {
                    accountId: sanitizedAccountId,
                    isValid: false,
                    status: 'NOT_FOUND'
                };
            } else {
                const errorText = await response.text();
                throw new BankingClientError(
                    `Validation failed: ${response.status}`,
                    'VALIDATION_ERROR',
                    { status: response.status, error: errorText }
                );
            }
        } catch (error) {
            if (error instanceof BankingClientError) {
                throw error;
            }
            
            this.logger.error('Account validation error', { error: error.message });
            throw new BankingClientError(
                `Validation error: ${error.message}`,
                'VALIDATION_ERROR'
            );
        }
    }
    
    /**
     * Get account balance with optional authentication
     * @param {string} accountId - Account ID
     * @param {boolean} useAuth - Whether to use JWT authentication
     * @returns {Promise<Object>} Balance information
     */
    async getAccountBalance(accountId, useAuth = false) {
        const sanitizedAccountId = ValidationUtils.validateAccountId(accountId);
        const url = `${this.config.baseUrl}/accounts/balance/${sanitizedAccountId}`;
        
        const headers = {};
        if (useAuth) {
            const token = await this.authManager.getToken('enquiry');
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }
        
        try {
            const response = await this.#makeRequestWithRetry(url, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const balanceInfo = await response.json();
                this.logger.info(`Retrieved balance for account ${sanitizedAccountId}`);
                return balanceInfo;
            } else {
                const errorText = await response.text();
                throw new BankingClientError(
                    `Balance retrieval failed: ${response.status}`,
                    'BALANCE_ERROR',
                    { status: response.status, error: errorText }
                );
            }
        } catch (error) {
            if (error instanceof BankingClientError) {
                throw error;
            }
            
            this.logger.error('Balance retrieval error', { error: error.message });
            throw new BankingClientError(
                `Balance error: ${error.message}`,
                'BALANCE_ERROR'
            );
        }
    }
    
    /**
     * Transfer funds between accounts with comprehensive validation
     * @param {TransferRequest} transferRequest - Transfer details
     * @param {boolean} useAuth - Whether to use JWT authentication
     * @returns {Promise<TransferResponse>} Transfer result
     */
    async transferFunds(transferRequest, useAuth = false) {
        // Validate and sanitize input
        const sanitizedRequest = {
            fromAccount: ValidationUtils.validateAccountId(transferRequest.fromAccount),
            toAccount: ValidationUtils.validateAccountId(transferRequest.toAccount),
            amount: ValidationUtils.validateAmount(transferRequest.amount),
            description: transferRequest.description 
                ? ValidationUtils.sanitizeString(transferRequest.description) 
                : undefined
        };
        
        // Validate accounts before transfer
        const [fromAccountInfo, toAccountInfo] = await Promise.all([
            this.validateAccount(sanitizedRequest.fromAccount),
            this.validateAccount(sanitizedRequest.toAccount)
        ]);
        
        if (!fromAccountInfo.isValid) {
            throw new BankingClientError(
                `Invalid source account: ${sanitizedRequest.fromAccount}`,
                'INVALID_SOURCE_ACCOUNT'
            );
        }
        
        if (!toAccountInfo.isValid) {
            throw new BankingClientError(
                `Invalid destination account: ${sanitizedRequest.toAccount}`,
                'INVALID_DESTINATION_ACCOUNT'
            );
        }
        
        // Prepare transfer payload
        const transferPayload = {
            fromAccount: sanitizedRequest.fromAccount,
            toAccount: sanitizedRequest.toAccount,
            amount: sanitizedRequest.amount
        };
        
        if (sanitizedRequest.description) {
            transferPayload.description = sanitizedRequest.description;
        }
        
        const url = `${this.config.baseUrl}/transfer`;
        const headers = {};
        
        if (useAuth) {
            const token = await this.authManager.getToken('transfer');
            if (token) {
                headers.Authorization = `Bearer ${token}`;
                this.logger.info('Using JWT authentication for transfer');
            } else {
                this.logger.warn('JWT authentication requested but token unavailable');
            }
        }
        
        try {
            this.logger.info('Initiating transfer', {
                fromAccount: sanitizedRequest.fromAccount,
                toAccount: sanitizedRequest.toAccount,
                amount: sanitizedRequest.amount
            });
            
            const response = await this.#makeRequestWithRetry(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(transferPayload)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                const transferResponse = {
                    transactionId: result.transactionId || randomUUID(),
                    status: result.status || 'SUCCESS',
                    message: result.message || 'Transfer completed',
                    fromAccount: result.fromAccount || sanitizedRequest.fromAccount,
                    toAccount: result.toAccount || sanitizedRequest.toAccount,
                    amount: result.amount || sanitizedRequest.amount,
                    timestamp: new Date()
                };
                
                this.logger.info('Transfer successful', {
                    transactionId: transferResponse.transactionId,
                    status: transferResponse.status
                });
                
                return transferResponse;
            } else {
                const errorText = await response.text();
                throw new BankingClientError(
                    `Transfer failed: ${response.status}`,
                    'TRANSFER_ERROR',
                    { status: response.status, error: errorText }
                );
            }
        } catch (error) {
            if (error instanceof BankingClientError) {
                throw error;
            }
            
            this.logger.error('Transfer error', { error: error.message });
            throw new BankingClientError(
                `Transfer error: ${error.message}`,
                'TRANSFER_ERROR'
            );
        }
    }
    
    /**
     * Get transaction history (requires authentication)
     * @param {string} accountId - Account ID
     * @returns {Promise<Array>} Transaction history
     */
    async getTransactionHistory(accountId) {
        const sanitizedAccountId = ValidationUtils.validateAccountId(accountId);
        
        const token = await this.authManager.getToken('enquiry');
        if (!token) {
            throw new BankingClientError(
                'Authentication required for transaction history',
                'AUTH_REQUIRED'
            );
        }
        
        const url = `${this.config.baseUrl}/transactions/history`;
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            const response = await this.#makeRequestWithRetry(url, {
                method: 'GET',
                headers
            });
            
            if (response.ok) {
                const history = await response.json();
                this.logger.info(`Retrieved transaction history for ${sanitizedAccountId}`);
                return history;
            } else {
                throw new BankingClientError(
                    `History retrieval failed: ${response.status}`,
                    'HISTORY_ERROR',
                    { status: response.status }
                );
            }
        } catch (error) {
            if (error instanceof BankingClientError) {
                throw error;
            }
            
            this.logger.error('Transaction history error', { error: error.message });
            throw new BankingClientError(
                `History error: ${error.message}`,
                'HISTORY_ERROR'
            );
        }
    }
    
    /**
     * Get client performance statistics
     * @returns {Object} Performance metrics
     */
    getPerformanceStats() {
        return {
            ...this.performanceMonitor.getStats(),
            config: {
                baseUrl: this.config.baseUrl,
                timeout: this.config.timeout,
                maxRetries: this.config.maxRetries
            }
        };
    }
    
    /**
     * Health check - verify server connectivity
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const response = await this.#makeRequestWithRetry(`${this.config.baseUrl}/accounts/validate/ACC1000`, {
                method: 'GET'
            });
            
            return {
                healthy: response.ok,
                status: response.status,
                responseTime: performance.now(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

/**
 * Utility function to create a pre-configured client
 * @param {Partial<BankingConfig>} options - Configuration options
 * @returns {ModernBankingClient} Configured client instance
 */
export function createBankingClient(options = {}) {
    const config = new BankingConfig(options);
    return new ModernBankingClient(config);
}

/**
 * Demo function showcasing all client features
 * @returns {Promise<void>}
 */
export async function runDemo() {
    console.log('🏦 Modern Banking Client Demo - ES2023+ Implementation');
    console.log('='.repeat(60));
    
    const client = createBankingClient({
        baseUrl: 'http://localhost:8123',
        logLevel: 'INFO'
    });
    
    try {
        // Demo 1: Account validation
        console.log('\n🔍 1. Account Validation Demo');
        const accounts = ['ACC1000', 'ACC1001', 'ACC2000', 'INVALID'];
        
        for (const account of accounts) {
            try {
                const result = await client.validateAccount(account);
                const status = result.isValid ? '✅' : '❌';
                console.log(`   ${status} ${account}: ${result.accountType || 'INVALID'}`);
            } catch (error) {
                console.log(`   ❌ ${account}: ERROR - ${error.message}`);
            }
        }
        
        // Demo 2: JWT Authentication
        console.log('\n🔐 2. JWT Authentication Demo');
        const token = await client.authManager.getToken('transfer');
        if (token) {
            console.log(`   ✅ JWT Token obtained successfully`);
            console.log(`   Token preview: ${token.substring(0, 20)}...`);
        } else {
            console.log(`   ❌ JWT Token acquisition failed`);
        }
        
        // Demo 3: Transfer with validation
        console.log('\n💸 3. Transfer Demo');
        const transferRequest = {
            fromAccount: 'ACC1000',
            toAccount: 'ACC1001',
            amount: 42.75,
            description: 'Demo transfer - ES2023+'
        };
        
        const result = await client.transferFunds(transferRequest, true);
        console.log(`   ✅ Transfer successful: ${result.transactionId}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Message: ${result.message}`);
        
        // Demo 4: Performance stats
        console.log('\n📊 4. Performance Statistics');
        const stats = client.getPerformanceStats();
        console.log(`   Requests made: ${stats.requestCount}`);
        console.log(`   Success rate: ${stats.successRate}%`);
        console.log(`   Average response time: ${stats.averageResponseTime}ms`);
        console.log(`   Requests per second: ${stats.requestsPerSecond}`);
        
        // Demo 5: Health check
        console.log('\n💚 5. Health Check');
        const health = await client.healthCheck();
        console.log(`   Server healthy: ${health.healthy ? '✅' : '❌'}`);
        console.log(`   Status: ${health.status || 'ERROR'}`);
        
        console.log('\n🎉 Demo completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Demo failed:', error.message);
        if (error instanceof BankingClientError) {
            console.error('Error details:', error.details);
        }
    }
}

// Export main classes and utilities
export {
    ModernBankingClient,
    BankingConfig,
    BankingClientError,
    Logger,
    ValidationUtils,
    AuthenticationManager,
    PerformanceMonitor
};

// Default export
export default ModernBankingClient;