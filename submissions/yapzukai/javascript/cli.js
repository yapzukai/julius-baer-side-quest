#!/usr/bin/env node

/**
 * Modern CLI interface for the Banking Client
 * Demonstrates modern Node.js CLI development with ES modules
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { createBankingClient, BankingClientError } from './banking-client.js';

const program = new Command();

// Configure CLI
program
    .name('banking-client')
    .description('Modern Banking Client - Enterprise JavaScript Implementation')
    .version('1.0.0')
    .option('-u, --url <url>', 'Banking API base URL', 'http://localhost:8123')
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('--verbose', 'Enable verbose logging')
    .option('--no-color', 'Disable colored output');

// Validate account command
program
    .command('validate <accountId>')
    .description('Validate an account ID')
    .option('--auth', 'Use JWT authentication')
    .action(async (accountId, options) => {
        const client = createClient(program.opts());
        
        try {
            const spinner = ora('Validating account...').start();
            const result = await client.validateAccount(accountId, options.auth);
            spinner.stop();
            
            if (result.isValid) {
                console.log(chalk.green(`✓ Account ${accountId} is valid`));
                console.log(`  Type: ${result.accountType || 'Unknown'}`);
                console.log(`  Status: ${result.status || 'Unknown'}`);
            } else {
                console.log(chalk.red(`✗ Account ${accountId} is invalid`));
            }
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// Balance command
program
    .command('balance <accountId>')
    .description('Get account balance')
    .option('--auth', 'Use JWT authentication')
    .action(async (accountId, options) => {
        const client = createClient(program.opts());
        
        try {
            const spinner = ora('Retrieving balance...').start();
            const result = await client.getAccountBalance(accountId, options.auth);
            spinner.stop();
            
            console.log(chalk.cyan(`Account: ${accountId}`));
            console.log(`Balance: $${result.balance || 'Unknown'}`);
            console.log(`Currency: ${result.currency || 'USD'}`);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// Transfer command
program
    .command('transfer')
    .description('Transfer funds between accounts')
    .option('--from <account>', 'Source account ID')
    .option('--to <account>', 'Destination account ID')
    .option('--amount <amount>', 'Transfer amount')
    .option('--description <desc>', 'Transfer description')
    .option('--auth', 'Use JWT authentication')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
        const client = createClient(program.opts());
        
        try {
            // Interactive prompts if not provided
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'fromAccount',
                    message: 'Source account ID:',
                    when: !options.from,
                    validate: input => input.trim() !== '' || 'Account ID is required'
                },
                {
                    type: 'input',
                    name: 'toAccount',
                    message: 'Destination account ID:',
                    when: !options.to,
                    validate: input => input.trim() !== '' || 'Account ID is required'
                },
                {
                    type: 'number',
                    name: 'amount',
                    message: 'Transfer amount:',
                    when: !options.amount,
                    validate: input => input > 0 || 'Amount must be positive'
                },
                {
                    type: 'input',
                    name: 'description',
                    message: 'Description (optional):',
                    when: !options.description
                }
            ]);
            
            const transferRequest = {
                fromAccount: options.from || answers.fromAccount,
                toAccount: options.to || answers.toAccount,
                amount: parseFloat(options.amount || answers.amount),
                description: options.description || answers.description
            };
            
            // Confirmation
            if (!options.confirm) {
                console.log(chalk.cyan('\nTransfer Details:'));
                console.log(`From: ${transferRequest.fromAccount}`);
                console.log(`To: ${transferRequest.toAccount}`);
                console.log(`Amount: $${transferRequest.amount}`);
                if (transferRequest.description) {
                    console.log(`Description: ${transferRequest.description}`);
                }
                
                const { proceed } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'proceed',
                    message: 'Proceed with transfer?',
                    default: false
                }]);
                
                if (!proceed) {
                    console.log('Transfer cancelled.');
                    return;
                }
            }
            
            const spinner = ora('Processing transfer...').start();
            const result = await client.transferFunds(transferRequest, options.auth);
            spinner.stop();
            
            console.log(chalk.green('\n✓ Transfer Successful!'));
            console.log(`Transaction ID: ${result.transactionId}`);
            console.log(`Status: ${result.status}`);
            console.log(`Message: ${result.message}`);
            console.log(`Timestamp: ${result.timestamp}`);
            
        } catch (error) {
            console.error(chalk.red(`\n✗ Transfer Failed: ${error.message}`));
            if (error instanceof BankingClientError && error.details) {
                console.error('Details:', error.details);
            }
            process.exit(1);
        }
    });

// History command
program
    .command('history <accountId>')
    .description('Get transaction history (requires authentication)')
    .action(async (accountId) => {
        const client = createClient(program.opts());
        
        try {
            const spinner = ora('Retrieving transaction history...').start();
            const result = await client.getTransactionHistory(accountId);
            spinner.stop();
            
            console.log(chalk.cyan(`Transaction History for ${accountId}:`));
            if (result && result.length > 0) {
                result.forEach(transaction => {
                    console.log(`  ${transaction.date || 'Unknown'} - ${transaction.description || 'Transfer'} - $${transaction.amount || 0}`);
                });
            } else {
                console.log('  No transactions found');
            }
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// Stats command
program
    .command('stats')
    .description('Show client performance statistics')
    .action(async () => {
        const client = createClient(program.opts());
        const stats = client.getPerformanceStats();
        
        console.log(chalk.cyan('Performance Statistics:'));
        console.log(`Uptime: ${stats.uptime}ms`);
        console.log(`Total Requests: ${stats.requestCount}`);
        console.log(`Success Rate: ${stats.successRate}%`);
        console.log(`Average Response Time: ${stats.averageResponseTime}ms`);
        console.log(`Requests/sec: ${stats.requestsPerSecond}`);
        console.log(`Base URL: ${stats.config.baseUrl}`);
        console.log(`Timeout: ${stats.config.timeout}ms`);
    });

// Health command
program
    .command('health')
    .description('Check server health')
    .action(async () => {
        const client = createClient(program.opts());
        
        try {
            const spinner = ora('Checking server health...').start();
            const health = await client.healthCheck();
            spinner.stop();
            
            if (health.healthy) {
                console.log(chalk.green('✓ Server is healthy'));
                console.log(`Status: ${health.status}`);
            } else {
                console.log(chalk.red('✗ Server is unhealthy'));
                console.log(`Error: ${health.error}`);
            }
        } catch (error) {
            console.error(chalk.red(`Health check failed: ${error.message}`));
            process.exit(1);
        }
    });

// Demo command
program
    .command('demo')
    .description('Run a comprehensive demo of all features')
    .action(async () => {
        try {
            const { runDemo } = await import('./banking-client.js');
            await runDemo();
        } catch (error) {
            console.error(chalk.red(`Demo failed: ${error.message}`));
            process.exit(1);
        }
    });

// Interactive mode
program
    .command('interactive')
    .alias('i')
    .description('Start interactive mode')
    .action(async () => {
        console.log(chalk.blue.bold('🏦 Modern Banking Client - Interactive Mode'));
        console.log('Select an operation:\n');
        
        const { operation } = await inquirer.prompt([{
            type: 'list',
            name: 'operation',
            message: 'What would you like to do?',
            choices: [
                { name: '🔍 Validate Account', value: 'validate' },
                { name: '💰 Check Balance', value: 'balance' },
                { name: '💸 Transfer Funds', value: 'transfer' },
                { name: '📊 View Statistics', value: 'stats' },
                { name: '🏥 Health Check', value: 'health' },
                { name: '🎭 Run Demo', value: 'demo' },
                { name: '🚪 Exit', value: 'exit' }
            ]
        }]);
        
        if (operation === 'exit') {
            console.log('Goodbye!');
            return;
        }
        
        // Execute the selected operation
        try {
            await program.parseAsync([process.argv[0], process.argv[1], operation]);
        } catch (error) {
            console.error(chalk.red(`Operation failed: ${error.message}`));
        }
    });

/**
 * Create banking client with CLI options
 */
function createClient(options) {
    const config = {
        baseUrl: options.url,
        timeout: parseInt(options.timeout),
        logLevel: options.verbose ? 'DEBUG' : 'INFO'
    };
    
    return createBankingClient(config);
}

// Handle global errors
process.on('unhandledRejection', (error) => {
    console.error(chalk.red('Unhandled error:'), error.message);
    process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}