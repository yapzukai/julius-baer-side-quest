/**
 * Comprehensive test suite for Modern Banking Client
 * Demonstrates professional JavaScript testing with Jest
 */

import { jest } from '@jest/globals';
import {
    ModernBankingClient,
    BankingConfig,
    BankingClientError,
    ValidationUtils,
    AuthenticationManager,
    PerformanceMonitor,
    createBankingClient
} from './banking-client.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('BankingConfig', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    test('should create valid configuration with defaults', () => {
        const config = new BankingConfig();
        
        expect(config.baseUrl).toBe('http://localhost:8123');
        expect(config.timeout).toBe(30000);
        expect(config.maxRetries).toBe(3);
        expect(config.retryDelay).toBe(1000);
    });
    
    test('should accept custom configuration', () => {
        const config = new BankingConfig({
            baseUrl: 'https://api.bank.com',
            timeout: 10000,
            maxRetries: 5
        });
        
        expect(config.baseUrl).toBe('https://api.bank.com');
        expect(config.timeout).toBe(10000);
        expect(config.maxRetries).toBe(5);
    });
    
    test('should validate URL format', () => {
        expect(() => new BankingConfig({ baseUrl: 'invalid-url' }))
            .toThrow('baseUrl must start with http:// or https://');
    });
    
    test('should remove trailing slash from URL', () => {
        const config = new BankingConfig({ baseUrl: 'http://localhost:8123/' });
        expect(config.baseUrl).toBe('http://localhost:8123');
    });
    
    test('should validate numeric ranges', () => {
        expect(() => new BankingConfig({ timeout: 500 }))
            .toThrow('Value must be a number between 1000 and 300000');
        
        expect(() => new BankingConfig({ maxRetries: -1 }))
            .toThrow('Value must be a number between 0 and 10');
    });
    
    test('should be immutable after creation', () => {
        const config = new BankingConfig();
        expect(() => { config.baseUrl = 'changed'; }).toThrow();
    });
});

describe('ValidationUtils', () => {
    describe('validateAccountId', () => {
        test('should validate and sanitize valid account IDs', () => {
            expect(ValidationUtils.validateAccountId('acc1000')).toBe('ACC1000');
            expect(ValidationUtils.validateAccountId('  ACC1001  ')).toBe('ACC1001');
        });
        
        test('should reject invalid account IDs', () => {
            expect(() => ValidationUtils.validateAccountId('')).toThrow('Account ID must be a non-empty string');
            expect(() => ValidationUtils.validateAccountId(null)).toThrow('Account ID must be a non-empty string');
            expect(() => ValidationUtils.validateAccountId('ACC-1000')).toThrow('Account ID contains invalid characters');
        });
    });
    
    describe('validateAmount', () => {
        test('should validate and round amounts', () => {
            expect(ValidationUtils.validateAmount(100.123)).toBe(100.12);
            expect(ValidationUtils.validateAmount('50.50')).toBe(50.50);
        });
        
        test('should reject invalid amounts', () => {
            expect(() => ValidationUtils.validateAmount(0)).toThrow('Amount must be a positive number');
            expect(() => ValidationUtils.validateAmount(-100)).toThrow('Amount must be a positive number');
            expect(() => ValidationUtils.validateAmount(2000000)).toThrow('Amount exceeds maximum limit');
            expect(() => ValidationUtils.validateAmount('invalid')).toThrow('Amount must be a positive number');
        });
    });
    
    describe('sanitizeString', () => {
        test('should sanitize string input', () => {
            expect(ValidationUtils.sanitizeString('  test  ')).toBe('test');
            expect(ValidationUtils.sanitizeString('test<script>')).toBe('testscript');
            expect(ValidationUtils.sanitizeString(123)).toBe('');
        });
        
        test('should limit string length', () => {
            const longString = 'a'.repeat(600);
            const result = ValidationUtils.sanitizeString(longString);
            expect(result.length).toBe(500);
        });
    });
});

describe('AuthenticationManager', () => {
    let authManager;
    let mockLogger;
    let config;
    
    beforeEach(() => {
        config = new BankingConfig();
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        authManager = new AuthenticationManager(config, mockLogger);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    test('should obtain token successfully', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'test-token-123' })
        });
        
        const token = await authManager.getToken('transfer');
        
        expect(token).toBe('test-token-123');
        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:8123/authToken?claim=transfer',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify({
                    username: 'modern_client',
                    password: 'secure_password'
                })
            })
        );
    });
    
    test('should cache tokens', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'cached-token' })
        });
        
        // First call should make request
        const token1 = await authManager.getToken('transfer');
        // Second call should use cache
        const token2 = await authManager.getToken('transfer');
        
        expect(token1).toBe('cached-token');
        expect(token2).toBe('cached-token');
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    
    test('should handle authentication failure', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 401
        });
        
        const token = await authManager.getToken('transfer');
        
        expect(token).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Failed to obtain token: 401'
        );
    });
    
    test('should validate token structure', () => {
        expect(authManager.validateTokenStructure('header.payload.signature')).toBe(true);
        expect(authManager.validateTokenStructure('invalid-token')).toBe(false);
        expect(authManager.validateTokenStructure('')).toBe(false);
    });
});

describe('PerformanceMonitor', () => {
    let monitor;
    
    beforeEach(() => {
        monitor = new PerformanceMonitor();
    });
    
    test('should track request metrics', () => {
        const startTime = monitor.recordRequestStart();
        expect(typeof startTime).toBe('number');
        expect(monitor.metrics.requestCount).toBe(1);
        
        monitor.recordRequestEnd(startTime, true);
        expect(monitor.metrics.successCount).toBe(1);
        expect(monitor.metrics.errorCount).toBe(0);
        
        monitor.recordRequestEnd(startTime, false);
        expect(monitor.metrics.errorCount).toBe(1);
    });
    
    test('should calculate performance statistics', () => {
        // Simulate some requests
        const start1 = monitor.recordRequestStart();
        monitor.recordRequestEnd(start1, true);
        
        const start2 = monitor.recordRequestStart();
        monitor.recordRequestEnd(start2, false);
        
        const stats = monitor.getStats();
        
        expect(stats.requestCount).toBe(2);
        expect(stats.successCount).toBe(1);
        expect(stats.errorCount).toBe(1);
        expect(stats.successRate).toBe(50);
        expect(typeof stats.averageResponseTime).toBe('number');
        expect(typeof stats.uptime).toBe('number');
    });
});

describe('ModernBankingClient', () => {
    let client;
    let config;
    
    beforeEach(() => {
        config = new BankingConfig();
        client = new ModernBankingClient(config);
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('validateAccount', () => {
        test('should validate account successfully', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    accountId: 'ACC1000',
                    isValid: true,
                    accountType: 'VALID_ACCOUNT',
                    status: 'ACTIVE'
                })
            });
            
            const result = await client.validateAccount('ACC1000');
            
            expect(result.isValid).toBe(true);
            expect(result.accountId).toBe('ACC1000');
            expect(result.accountType).toBe('VALID_ACCOUNT');
        });
        
        test('should handle non-existent account', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });
            
            const result = await client.validateAccount('INVALID');
            
            expect(result.isValid).toBe(false);
            expect(result.status).toBe('NOT_FOUND');
        });
        
        test('should handle validation errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Server Error'
            });
            
            await expect(client.validateAccount('ACC1000'))
                .rejects.toThrow(BankingClientError);
        });
        
        test('should include JWT token when useAuth is true', async () => {
            // Mock token request
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ token: 'auth-token' })
            });
            
            // Mock validation request
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ accountId: 'ACC1000', isValid: true })
            });
            
            await client.validateAccount('ACC1000', true);
            
            // Second call should include Authorization header
            expect(fetch).toHaveBeenNthCalledWith(2,
                'http://localhost:8123/accounts/validate/ACC1000',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer auth-token'
                    })
                })
            );
        });
    });
    
    describe('transferFunds', () => {
        test('should transfer funds successfully', async () => {
            // Mock account validations
            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ accountId: 'ACC1000', isValid: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ accountId: 'ACC1001', isValid: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        transactionId: 'txn-123',
                        status: 'SUCCESS',
                        message: 'Transfer completed',
                        fromAccount: 'ACC1000',
                        toAccount: 'ACC1001',
                        amount: 100.50
                    })
                });
            
            const transferRequest = {
                fromAccount: 'ACC1000',
                toAccount: 'ACC1001',
                amount: 100.50,
                description: 'Test transfer'
            };
            
            const result = await client.transferFunds(transferRequest);
            
            expect(result.transactionId).toBe('txn-123');
            expect(result.status).toBe('SUCCESS');
            expect(result.amount).toBe(100.50);
            expect(result.timestamp).toBeInstanceOf(Date);
        });
        
        test('should reject transfer with invalid source account', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ accountId: 'INVALID', isValid: false })
            });
            
            const transferRequest = {
                fromAccount: 'INVALID',
                toAccount: 'ACC1001',
                amount: 100.00
            };
            
            await expect(client.transferFunds(transferRequest))
                .rejects.toThrow('Invalid source account: INVALID');
        });
        
        test('should reject transfer with invalid destination account', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ accountId: 'ACC1000', isValid: true })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ accountId: 'INVALID', isValid: false })
                });
            
            const transferRequest = {
                fromAccount: 'ACC1000',
                toAccount: 'INVALID',
                amount: 100.00
            };
            
            await expect(client.transferFunds(transferRequest))
                .rejects.toThrow('Invalid destination account: INVALID');
        });
        
        test('should validate transfer amount', async () => {
            const transferRequest = {
                fromAccount: 'ACC1000',
                toAccount: 'ACC1001',
                amount: -100.00  // Invalid amount
            };
            
            await expect(client.transferFunds(transferRequest))
                .rejects.toThrow(BankingClientError);
        });
    });
    
    describe('retry mechanism', () => {
        test('should retry on server errors', async () => {
            fetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ accountId: 'ACC1000', isValid: true })
                });
            
            const result = await client.validateAccount('ACC1000');
            
            expect(result.isValid).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(2);
        });
        
        test('should not retry on client errors', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Bad Request'
            });
            
            await expect(client.validateAccount('ACC1000'))
                .rejects.toThrow(BankingClientError);
            
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('performance monitoring', () => {
        test('should track performance statistics', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ accountId: 'ACC1000', isValid: true })
            });
            
            await client.validateAccount('ACC1000');
            
            const stats = client.getPerformanceStats();
            
            expect(stats.requestCount).toBeGreaterThan(0);
            expect(stats.config.baseUrl).toBe('http://localhost:8123');
        });
    });
    
    describe('health check', () => {
        test('should return healthy status', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });
            
            const health = await client.healthCheck();
            
            expect(health.healthy).toBe(true);
            expect(health.status).toBe(200);
            expect(health.timestamp).toBeDefined();
        });
        
        test('should return unhealthy status on error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));
            
            const health = await client.healthCheck();
            
            expect(health.healthy).toBe(false);
            expect(health.error).toBe('Network error');
        });
    });
});

describe('createBankingClient', () => {
    test('should create client with default configuration', () => {
        const client = createBankingClient();
        
        expect(client).toBeInstanceOf(ModernBankingClient);
        expect(client.config.baseUrl).toBe('http://localhost:8123');
    });
    
    test('should create client with custom configuration', () => {
        const client = createBankingClient({
            baseUrl: 'https://api.bank.com',
            timeout: 10000
        });
        
        expect(client.config.baseUrl).toBe('https://api.bank.com');
        expect(client.config.timeout).toBe(10000);
    });
});

describe('BankingClientError', () => {
    test('should create error with message and code', () => {
        const error = new BankingClientError('Test error', 'TEST_CODE', { detail: 'info' });
        
        expect(error.name).toBe('BankingClientError');
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_CODE');
        expect(error.details).toEqual({ detail: 'info' });
        expect(error.timestamp).toBeDefined();
    });
    
    test('should use default code when not provided', () => {
        const error = new BankingClientError('Test error');
        
        expect(error.code).toBe('BANKING_ERROR');
        expect(error.details).toEqual({});
    });
});