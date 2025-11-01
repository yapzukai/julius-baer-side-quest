#!/usr/bin/env python3
"""
Modern Banking Client - Comprehensive Python 3.11+ Implementation
==================================================================

A fully modernized banking client demonstrating enterprise-grade Python development:
- Async/await patterns with aiohttp
- Type hints and dataclasses
- Professional logging with structured output
- JWT authentication and secure configuration
- Retry logic with exponential backoff
- Connection pooling and timeout management
- Comprehensive error handling
- Input validation and sanitization
- Performance monitoring and metrics
- Modern CLI interface

Author: Modernization Demonstration
Python Version: 3.11+
Dependencies: aiohttp, click, pydantic, python-jose, colorama
"""

import asyncio
import json
import logging
import os
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union, List, Tuple
from pathlib import Path
import traceback

# Third-party imports
import aiohttp
import click
from pydantic import BaseModel, Field, validator, SecretStr
from jose import jwt, JWTError
from colorama import init, Fore, Style, Back

# Initialize colorama for cross-platform colored output
init(autoreset=True)

# Configure professional logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('banking_client.log')
    ]
)
logger = logging.getLogger(__name__)

# Type aliases for better code readability
TransactionResult = Dict[str, Any]
AccountInfo = Dict[str, Any]


class BankingConfig(BaseModel):
    """Configuration model with validation using Pydantic."""
    
    base_url: str = Field(default="http://localhost:8123", description="Banking API base URL")
    timeout: int = Field(default=30, ge=1, le=300, description="Request timeout in seconds")
    max_retries: int = Field(default=3, ge=0, le=10, description="Maximum retry attempts")
    retry_delay: float = Field(default=1.0, ge=0.1, le=10.0, description="Base retry delay in seconds")
    jwt_secret: SecretStr = Field(default="secret", description="JWT secret for token validation")
    log_level: str = Field(default="INFO", description="Logging level")
    
    @validator('base_url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('base_url must start with http:// or https://')
        return v.rstrip('/')


@dataclass
class TransferRequest:
    """Data class for transfer requests with validation."""
    
    from_account: str
    to_account: str
    amount: float
    description: Optional[str] = None
    
    def __post_init__(self):
        """Validate transfer request data."""
        if not self.from_account or not self.to_account:
            raise ValueError("Account IDs cannot be empty")
        
        if self.amount <= 0:
            raise ValueError("Amount must be positive")
        
        if self.amount > 1_000_000:
            raise ValueError("Amount exceeds maximum limit")
        
        # Sanitize account IDs
        self.from_account = self.from_account.strip().upper()
        self.to_account = self.to_account.strip().upper()
        
        # Round amount to 2 decimal places
        self.amount = round(self.amount, 2)


@dataclass
class TransferResponse:
    """Data class for transfer responses."""
    
    transaction_id: str
    status: str
    message: str
    from_account: str
    to_account: str
    amount: float
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class AuthenticationManager:
    """Manages JWT authentication with token caching and refresh."""
    
    def __init__(self, config: BankingConfig):
        self.config = config
        self._token_cache: Dict[str, Tuple[str, datetime]] = {}
        self._token_expiry_buffer = timedelta(minutes=5)
    
    async def get_token(self, session: aiohttp.ClientSession, scope: str = "transfer") -> Optional[str]:
        """Get JWT token with caching and automatic refresh."""
        
        # Check cache first
        if scope in self._token_cache:
            token, expiry = self._token_cache[scope]
            if datetime.now() < expiry - self._token_expiry_buffer:
                logger.debug(f"Using cached token for scope: {scope}")
                return token
        
        # Request new token
        try:
            auth_payload = {
                "username": "modern_client",
                "password": "secure_password"
            }
            
            url = f"{self.config.base_url}/authToken"
            params = {"claim": scope}
            
            async with session.post(url, json=auth_payload, params=params) as response:
                if response.status == 200:
                    token_data = await response.json()
                    token = token_data.get("token")
                    
                    if token:
                        # Cache token with expiry
                        expiry = datetime.now() + timedelta(hours=1)  # Assume 1 hour expiry
                        self._token_cache[scope] = (token, expiry)
                        logger.info(f"Successfully obtained JWT token for scope: {scope}")
                        return token
                
                logger.error(f"Failed to obtain token: {response.status}")
                return None
                
        except Exception as e:
            logger.error(f"Error obtaining authentication token: {e}")
            return None
    
    def validate_token(self, token: str) -> bool:
        """Validate JWT token structure."""
        try:
            # Basic JWT structure validation
            parts = token.split('.')
            return len(parts) == 3
        except Exception:
            return False


class BankingClientError(Exception):
    """Custom exception for banking client errors."""
    pass


class ModernBankingClient:
    """
    Modern, async banking client with enterprise features.
    
    Features:
    - Async/await for non-blocking operations
    - Connection pooling and session management
    - Retry logic with exponential backoff
    - JWT authentication with token caching
    - Comprehensive error handling and logging
    - Request/response validation
    - Performance monitoring
    """
    
    def __init__(self, config: BankingConfig):
        self.config = config
        self.auth_manager = AuthenticationManager(config)
        self.session: Optional[aiohttp.ClientSession] = None
        self._request_count = 0
        self._start_time = time.time()
        
        # Set up logging level
        logging.getLogger().setLevel(getattr(logging, config.log_level.upper()))
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def initialize(self):
        """Initialize the HTTP session with connection pooling."""
        
        timeout = aiohttp.ClientTimeout(total=self.config.timeout)
        connector = aiohttp.TCPConnector(
            limit=100,  # Connection pool size
            limit_per_host=30,
            keepalive_timeout=60,
            enable_cleanup_closed=True
        )
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'ModernBankingClient/1.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        )
        
        logger.info("Banking client session initialized")
    
    async def close(self):
        """Clean up resources."""
        if self.session:
            await self.session.close()
            logger.info("Banking client session closed")
    
    async def _make_request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> aiohttp.ClientResponse:
        """Make HTTP request with retry logic and exponential backoff."""
        
        for attempt in range(self.config.max_retries + 1):
            try:
                self._request_count += 1
                
                async with self.session.request(method, url, **kwargs) as response:
                    # Log request details
                    logger.debug(f"{method} {url} -> {response.status}")
                    
                    if response.status < 500:  # Don't retry client errors
                        return response
                    
                    if attempt == self.config.max_retries:
                        response.raise_for_status()
                    
                    # Server error, retry with exponential backoff
                    delay = self.config.retry_delay * (2 ** attempt)
                    logger.warning(f"Server error {response.status}, retrying in {delay}s (attempt {attempt + 1})")
                    await asyncio.sleep(delay)
                    
            except aiohttp.ClientError as e:
                if attempt == self.config.max_retries:
                    logger.error(f"Request failed after {self.config.max_retries} retries: {e}")
                    raise BankingClientError(f"Network error: {e}")
                
                delay = self.config.retry_delay * (2 ** attempt)
                logger.warning(f"Network error, retrying in {delay}s: {e}")
                await asyncio.sleep(delay)
    
    async def validate_account(self, account_id: str, use_auth: bool = False) -> AccountInfo:
        """
        Validate account with optional authentication.
        
        Args:
            account_id: Account ID to validate
            use_auth: Whether to use JWT authentication
            
        Returns:
            Account information dictionary
            
        Raises:
            BankingClientError: If validation fails
        """
        
        if not account_id or not account_id.strip():
            raise ValueError("Account ID cannot be empty")
        
        account_id = account_id.strip().upper()
        url = f"{self.config.base_url}/accounts/validate/{account_id}"
        
        headers = {}
        if use_auth:
            token = await self.auth_manager.get_token(self.session, "enquiry")
            if token:
                headers['Authorization'] = f'Bearer {token}'
        
        try:
            response = await self._make_request_with_retry('GET', url, headers=headers)
            
            if response.status == 200:
                account_info = await response.json()
                logger.info(f"Account {account_id} validation: {account_info.get('isValid', False)}")
                return account_info
            elif response.status == 404:
                logger.warning(f"Account {account_id} not found")
                return {"accountId": account_id, "isValid": False, "status": "NOT_FOUND"}
            else:
                error_text = await response.text()
                logger.error(f"Account validation failed: {response.status} - {error_text}")
                raise BankingClientError(f"Validation failed: {response.status}")
                
        except Exception as e:
            if isinstance(e, BankingClientError):
                raise
            logger.error(f"Account validation error: {e}")
            raise BankingClientError(f"Validation error: {e}")
    
    async def get_account_balance(self, account_id: str, use_auth: bool = False) -> Dict[str, Any]:
        """Get account balance with optional authentication."""
        
        if not account_id or not account_id.strip():
            raise ValueError("Account ID cannot be empty")
        
        account_id = account_id.strip().upper()
        url = f"{self.config.base_url}/accounts/balance/{account_id}"
        
        headers = {}
        if use_auth:
            token = await self.auth_manager.get_token(self.session, "enquiry")
            if token:
                headers['Authorization'] = f'Bearer {token}'
        
        try:
            response = await self._make_request_with_retry('GET', url, headers=headers)
            
            if response.status == 200:
                balance_info = await response.json()
                logger.info(f"Retrieved balance for account {account_id}")
                return balance_info
            else:
                error_text = await response.text()
                logger.error(f"Balance retrieval failed: {response.status} - {error_text}")
                raise BankingClientError(f"Balance retrieval failed: {response.status}")
                
        except Exception as e:
            if isinstance(e, BankingClientError):
                raise
            logger.error(f"Balance retrieval error: {e}")
            raise BankingClientError(f"Balance error: {e}")
    
    async def transfer_funds(
        self,
        request: TransferRequest,
        use_auth: bool = False
    ) -> TransferResponse:
        """
        Transfer funds between accounts with comprehensive validation.
        
        Args:
            request: Transfer request data
            use_auth: Whether to use JWT authentication
            
        Returns:
            Transfer response with transaction details
            
        Raises:
            BankingClientError: If transfer fails
        """
        
        # Validate accounts before transfer
        from_account_info = await self.validate_account(request.from_account)
        to_account_info = await self.validate_account(request.to_account)
        
        if not from_account_info.get('isValid', False):
            raise BankingClientError(f"Invalid source account: {request.from_account}")
        
        if not to_account_info.get('isValid', False):
            raise BankingClientError(f"Invalid destination account: {request.to_account}")
        
        # Prepare transfer payload
        transfer_payload = {
            "fromAccount": request.from_account,
            "toAccount": request.to_account,
            "amount": request.amount
        }
        
        if request.description:
            transfer_payload["description"] = request.description
        
        url = f"{self.config.base_url}/transfer"
        headers = {}
        
        if use_auth:
            token = await self.auth_manager.get_token(self.session, "transfer")
            if token:
                headers['Authorization'] = f'Bearer {token}'
                logger.info("Using JWT authentication for transfer")
            else:
                logger.warning("JWT authentication requested but token unavailable")
        
        try:
            logger.info(f"Initiating transfer: {request.from_account} -> {request.to_account}, Amount: ${request.amount}")
            
            response = await self._make_request_with_retry(
                'POST',
                url,
                json=transfer_payload,
                headers=headers
            )
            
            if response.status == 200:
                result = await response.json()
                
                transfer_response = TransferResponse(
                    transaction_id=result.get('transactionId', ''),
                    status=result.get('status', ''),
                    message=result.get('message', ''),
                    from_account=result.get('fromAccount', ''),
                    to_account=result.get('toAccount', ''),
                    amount=result.get('amount', 0.0)
                )
                
                logger.info(f"Transfer successful: {transfer_response.transaction_id}")
                return transfer_response
                
            else:
                error_text = await response.text()
                logger.error(f"Transfer failed: {response.status} - {error_text}")
                raise BankingClientError(f"Transfer failed: {response.status} - {error_text}")
                
        except Exception as e:
            if isinstance(e, BankingClientError):
                raise
            logger.error(f"Transfer error: {e}")
            traceback.print_exc()
            raise BankingClientError(f"Transfer error: {e}")
    
    async def get_transaction_history(self, account_id: str) -> List[Dict[str, Any]]:
        """Get transaction history with authentication."""
        
        token = await self.auth_manager.get_token(self.session, "enquiry")
        if not token:
            raise BankingClientError("Authentication required for transaction history")
        
        url = f"{self.config.base_url}/transactions/history"
        headers = {'Authorization': f'Bearer {token}'}
        params = {'accountId': account_id}
        
        try:
            response = await self._make_request_with_retry(
                'GET',
                url,
                headers=headers,
                params=params
            )
            
            if response.status == 200:
                history = await response.json()
                logger.info(f"Retrieved transaction history for {account_id}")
                return history
            else:
                error_text = await response.text()
                raise BankingClientError(f"History retrieval failed: {response.status}")
                
        except Exception as e:
            if isinstance(e, BankingClientError):
                raise
            logger.error(f"Transaction history error: {e}")
            raise BankingClientError(f"History error: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get client performance statistics."""
        
        uptime = time.time() - self._start_time
        return {
            "uptime_seconds": round(uptime, 2),
            "total_requests": self._request_count,
            "requests_per_second": round(self._request_count / uptime, 2) if uptime > 0 else 0,
            "config": {
                "base_url": self.config.base_url,
                "timeout": self.config.timeout,
                "max_retries": self.config.max_retries
            }
        }


# Modern CLI interface using Click
@click.group()
@click.option('--config-file', default='config.json', help='Configuration file path')
@click.option('--base-url', default='http://localhost:8123', help='Banking API base URL')
@click.option('--timeout', default=30, help='Request timeout in seconds')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
@click.pass_context
def cli(ctx, config_file, base_url, timeout, verbose):
    """Modern Banking Client - Enterprise Python Implementation."""
    
    # Load configuration
    config_data = {"base_url": base_url, "timeout": timeout}
    
    if Path(config_file).exists():
        try:
            with open(config_file, 'r') as f:
                file_config = json.load(f)
                config_data.update(file_config)
        except Exception as e:
            click.echo(f"{Fore.YELLOW}Warning: Could not load config file: {e}")
    
    if verbose:
        config_data["log_level"] = "DEBUG"
    
    # Store config in context
    ctx.ensure_object(dict)
    ctx.obj['config'] = BankingConfig(**config_data)


@cli.command()
@click.argument('account_id')
@click.option('--use-auth', is_flag=True, help='Use JWT authentication')
@click.pass_context
def validate(ctx, account_id, use_auth):
    """Validate an account ID."""
    
    async def _validate():
        config = ctx.obj['config']
        async with ModernBankingClient(config) as client:
            try:
                result = await client.validate_account(account_id, use_auth)
                
                if result.get('isValid', False):
                    click.echo(f"{Fore.GREEN}✓ Account {account_id} is valid")
                    click.echo(f"  Type: {result.get('accountType', 'Unknown')}")
                    click.echo(f"  Status: {result.get('status', 'Unknown')}")
                else:
                    click.echo(f"{Fore.RED}✗ Account {account_id} is invalid")
                
            except Exception as e:
                click.echo(f"{Fore.RED}Error: {e}")
                sys.exit(1)
    
    asyncio.run(_validate())


@cli.command()
@click.argument('account_id')
@click.option('--use-auth', is_flag=True, help='Use JWT authentication')
@click.pass_context
def balance(ctx, account_id, use_auth):
    """Get account balance."""
    
    async def _balance():
        config = ctx.obj['config']
        async with ModernBankingClient(config) as client:
            try:
                result = await client.get_account_balance(account_id, use_auth)
                
                click.echo(f"{Fore.CYAN}Account: {account_id}")
                click.echo(f"Balance: ${result.get('balance', 'Unknown')}")
                click.echo(f"Currency: {result.get('currency', 'USD')}")
                
            except Exception as e:
                click.echo(f"{Fore.RED}Error: {e}")
                sys.exit(1)
    
    asyncio.run(_balance())


@cli.command()
@click.argument('from_account')
@click.argument('to_account')
@click.argument('amount', type=float)
@click.option('--description', help='Transfer description')
@click.option('--use-auth', is_flag=True, help='Use JWT authentication')
@click.option('--confirm', is_flag=True, help='Skip confirmation prompt')
@click.pass_context
def transfer(ctx, from_account, to_account, amount, description, use_auth, confirm):
    """Transfer funds between accounts."""
    
    async def _transfer():
        config = ctx.obj['config']
        
        # Create transfer request
        try:
            request = TransferRequest(
                from_account=from_account,
                to_account=to_account,
                amount=amount,
                description=description
            )
        except ValueError as e:
            click.echo(f"{Fore.RED}Invalid request: {e}")
            sys.exit(1)
        
        # Confirmation prompt
        if not confirm:
            click.echo(f"\n{Fore.CYAN}Transfer Details:")
            click.echo(f"From: {request.from_account}")
            click.echo(f"To: {request.to_account}")
            click.echo(f"Amount: ${request.amount}")
            if request.description:
                click.echo(f"Description: {request.description}")
            
            if not click.confirm(f"\n{Fore.YELLOW}Proceed with transfer?"):
                click.echo("Transfer cancelled.")
                return
        
        async with ModernBankingClient(config) as client:
            try:
                with click.progressbar(length=1, label='Processing transfer') as bar:
                    result = await client.transfer_funds(request, use_auth)
                    bar.update(1)
                
                click.echo(f"\n{Fore.GREEN}✓ Transfer Successful!")
                click.echo(f"Transaction ID: {result.transaction_id}")
                click.echo(f"Status: {result.status}")
                click.echo(f"Message: {result.message}")
                click.echo(f"Timestamp: {result.timestamp}")
                
            except Exception as e:
                click.echo(f"\n{Fore.RED}✗ Transfer Failed: {e}")
                sys.exit(1)
    
    asyncio.run(_transfer())


@cli.command()
@click.argument('account_id')
@click.pass_context
def history(ctx, account_id):
    """Get transaction history (requires authentication)."""
    
    async def _history():
        config = ctx.obj['config']
        async with ModernBankingClient(config) as client:
            try:
                result = await client.get_transaction_history(account_id)
                
                click.echo(f"{Fore.CYAN}Transaction History for {account_id}:")
                for transaction in result:
                    click.echo(f"  {transaction.get('date', 'Unknown')} - {transaction.get('description', 'Transfer')} - ${transaction.get('amount', 0)}")
                
            except Exception as e:
                click.echo(f"{Fore.RED}Error: {e}")
                sys.exit(1)
    
    asyncio.run(_history())


@cli.command()
@click.pass_context
def stats(ctx):
    """Show client performance statistics."""
    
    async def _stats():
        config = ctx.obj['config']
        async with ModernBankingClient(config) as client:
            stats = client.get_performance_stats()
            
            click.echo(f"{Fore.CYAN}Performance Statistics:")
            click.echo(f"Uptime: {stats['uptime_seconds']}s")
            click.echo(f"Total Requests: {stats['total_requests']}")
            click.echo(f"Requests/sec: {stats['requests_per_second']}")
            click.echo(f"Base URL: {stats['config']['base_url']}")
            click.echo(f"Timeout: {stats['config']['timeout']}s")
    
    asyncio.run(_stats())


@cli.command()
def demo():
    """Run a comprehensive demo of all features."""
    
    async def _demo():
        click.echo(f"{Fore.MAGENTA}{Style.BRIGHT}🏦 Modern Banking Client Demo")
        click.echo("=" * 50)
        
        config = BankingConfig()
        async with ModernBankingClient(config) as client:
            try:
                # Demo 1: Account validation
                click.echo(f"\n{Fore.CYAN}1. Account Validation Demo")
                accounts = ["ACC1000", "ACC1001", "ACC2000", "INVALID"]
                
                for account in accounts:
                    result = await client.validate_account(account)
                    status = f"{Fore.GREEN}✓" if result.get('isValid') else f"{Fore.RED}✗"
                    click.echo(f"   {status} {account}: {result.get('accountType', 'INVALID')}")
                
                # Demo 2: JWT Authentication
                click.echo(f"\n{Fore.CYAN}2. JWT Authentication Demo")
                token = await client.auth_manager.get_token(client.session, "transfer")
                if token:
                    click.echo(f"   {Fore.GREEN}✓ JWT Token obtained successfully")
                    click.echo(f"   Token preview: {token[:20]}...")
                else:
                    click.echo(f"   {Fore.RED}✗ JWT Token acquisition failed")
                
                # Demo 3: Transfer with validation
                click.echo(f"\n{Fore.CYAN}3. Transfer Demo")
                request = TransferRequest("ACC1000", "ACC1001", 25.50, "Demo transfer")
                
                result = await client.transfer_funds(request, use_auth=True)
                click.echo(f"   {Fore.GREEN}✓ Transfer successful: {result.transaction_id}")
                click.echo(f"   Status: {result.status}")
                click.echo(f"   Message: {result.message}")
                
                # Demo 4: Performance stats
                click.echo(f"\n{Fore.CYAN}4. Performance Statistics")
                stats = client.get_performance_stats()
                click.echo(f"   Requests made: {stats['total_requests']}")
                click.echo(f"   Uptime: {stats['uptime_seconds']}s")
                click.echo(f"   Rate: {stats['requests_per_second']} req/s")
                
                click.echo(f"\n{Fore.GREEN}{Style.BRIGHT}🎉 Demo completed successfully!")
                
            except Exception as e:
                click.echo(f"\n{Fore.RED}Demo failed: {e}")
                traceback.print_exc()
    
    asyncio.run(_demo())


if __name__ == "__main__":
    cli()