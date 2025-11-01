"""
Comprehensive test suite for the Modern Banking Client.
Demonstrates professional testing practices with async support.
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch
from aiohttp import ClientSession, ClientError
from datetime import datetime

# Import our banking client modules
from banking_client import (
    ModernBankingClient,
    BankingConfig,
    TransferRequest,
    TransferResponse,
    AuthenticationManager,
    BankingClientError
)


@pytest.fixture
def config():
    """Test configuration fixture."""
    return BankingConfig(
        base_url="http://localhost:8123",
        timeout=10,
        max_retries=2,
        retry_delay=0.1
    )


@pytest.fixture
def transfer_request():
    """Sample transfer request fixture."""
    return TransferRequest(
        from_account="ACC1000",
        to_account="ACC1001",
        amount=100.50,
        description="Test transfer"
    )


@pytest.fixture
async def mock_session():
    """Mock aiohttp session fixture."""
    session = AsyncMock(spec=ClientSession)
    return session


class TestBankingConfig:
    """Test configuration validation."""
    
    def test_valid_config(self):
        """Test valid configuration creation."""
        config = BankingConfig(base_url="https://api.bank.com")
        assert config.base_url == "https://api.bank.com"
        assert config.timeout == 30  # Default value
    
    def test_invalid_url(self):
        """Test invalid URL validation."""
        with pytest.raises(ValueError, match="must start with http"):
            BankingConfig(base_url="ftp://invalid.com")
    
    def test_url_normalization(self):
        """Test URL trailing slash removal."""
        config = BankingConfig(base_url="http://localhost:8123/")
        assert config.base_url == "http://localhost:8123"


class TestTransferRequest:
    """Test transfer request validation."""
    
    def test_valid_request(self):
        """Test valid transfer request creation."""
        request = TransferRequest("ACC1000", "ACC1001", 100.0)
        assert request.from_account == "ACC1000"
        assert request.to_account == "ACC1001"
        assert request.amount == 100.0
    
    def test_account_sanitization(self):
        """Test account ID sanitization."""
        request = TransferRequest("  acc1000  ", "  acc1001  ", 100.0)
        assert request.from_account == "ACC1000"
        assert request.to_account == "ACC1001"
    
    def test_amount_rounding(self):
        """Test amount precision rounding."""
        request = TransferRequest("ACC1000", "ACC1001", 100.123456)
        assert request.amount == 100.12
    
    def test_invalid_amount(self):
        """Test invalid amount validation."""
        with pytest.raises(ValueError, match="Amount must be positive"):
            TransferRequest("ACC1000", "ACC1001", -50.0)
        
        with pytest.raises(ValueError, match="exceeds maximum limit"):
            TransferRequest("ACC1000", "ACC1001", 2_000_000.0)
    
    def test_empty_accounts(self):
        """Test empty account validation."""
        with pytest.raises(ValueError, match="cannot be empty"):
            TransferRequest("", "ACC1001", 100.0)
        
        with pytest.raises(ValueError, match="cannot be empty"):
            TransferRequest("ACC1000", "", 100.0)


class TestAuthenticationManager:
    """Test JWT authentication management."""
    
    @pytest.mark.asyncio
    async def test_token_acquisition(self, config, mock_session):
        """Test successful token acquisition."""
        # Mock successful response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {"token": "test_token_123"}
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        auth_manager = AuthenticationManager(config)
        token = await auth_manager.get_token(mock_session, "transfer")
        
        assert token == "test_token_123"
        mock_session.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_token_caching(self, config, mock_session):
        """Test token caching mechanism."""
        # Mock successful response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json.return_value = {"token": "cached_token"}
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        auth_manager = AuthenticationManager(config)
        
        # First call should make HTTP request
        token1 = await auth_manager.get_token(mock_session, "transfer")
        # Second call should use cache
        token2 = await auth_manager.get_token(mock_session, "transfer")
        
        assert token1 == token2 == "cached_token"
        # Should only call once due to caching
        assert mock_session.post.call_count == 1
    
    @pytest.mark.asyncio
    async def test_token_failure(self, config, mock_session):
        """Test token acquisition failure."""
        # Mock failed response
        mock_response = AsyncMock()
        mock_response.status = 401
        mock_session.post.return_value.__aenter__.return_value = mock_response
        
        auth_manager = AuthenticationManager(config)
        token = await auth_manager.get_token(mock_session, "transfer")
        
        assert token is None
    
    def test_token_validation(self, config):
        """Test JWT token validation."""
        auth_manager = AuthenticationManager(config)
        
        # Valid JWT structure
        valid_token = "header.payload.signature"
        assert auth_manager.validate_token(valid_token) is True
        
        # Invalid JWT structure
        invalid_token = "invalid_token"
        assert auth_manager.validate_token(invalid_token) is False


class TestModernBankingClient:
    """Test the main banking client functionality."""
    
    @pytest.mark.asyncio
    async def test_client_initialization(self, config):
        """Test client initialization and cleanup."""
        client = ModernBankingClient(config)
        
        await client.initialize()
        assert client.session is not None
        
        await client.close()
    
    @pytest.mark.asyncio
    async def test_context_manager(self, config):
        """Test async context manager usage."""
        async with ModernBankingClient(config) as client:
            assert client.session is not None
        
        # Session should be closed after context exit
        assert client.session.closed
    
    @pytest.mark.asyncio
    async def test_account_validation_success(self, config):
        """Test successful account validation."""
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock successful validation response
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json.return_value = {
                "accountId": "ACC1000",
                "isValid": True,
                "accountType": "VALID_ACCOUNT",
                "status": "ACTIVE"
            }
            mock_session.request.return_value.__aenter__.return_value = mock_response
            
            client = ModernBankingClient(config)
            await client.initialize()
            
            result = await client.validate_account("ACC1000")
            
            assert result["isValid"] is True
            assert result["accountId"] == "ACC1000"
            assert result["accountType"] == "VALID_ACCOUNT"
            
            await client.close()
    
    @pytest.mark.asyncio
    async def test_account_validation_not_found(self, config):
        """Test account validation for non-existent account."""
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock 404 response
            mock_response = AsyncMock()
            mock_response.status = 404
            mock_session.request.return_value.__aenter__.return_value = mock_response
            
            client = ModernBankingClient(config)
            await client.initialize()
            
            result = await client.validate_account("INVALID")
            
            assert result["isValid"] is False
            assert result["status"] == "NOT_FOUND"
            
            await client.close()
    
    @pytest.mark.asyncio
    async def test_transfer_success(self, config, transfer_request):
        """Test successful fund transfer."""
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock validation responses (both accounts valid)
            validation_response = AsyncMock()
            validation_response.status = 200
            validation_response.json.return_value = {
                "accountId": "ACC1000",
                "isValid": True,
                "accountType": "VALID_ACCOUNT"
            }
            
            # Mock transfer response
            transfer_response = AsyncMock()
            transfer_response.status = 200
            transfer_response.json.return_value = {
                "transactionId": "txn_123456",
                "status": "SUCCESS",
                "message": "Transfer completed successfully",
                "fromAccount": "ACC1000",
                "toAccount": "ACC1001",
                "amount": 100.50
            }
            
            mock_session.request.return_value.__aenter__.side_effect = [
                validation_response,  # First validation
                validation_response,  # Second validation
                transfer_response     # Transfer
            ]
            
            client = ModernBankingClient(config)
            await client.initialize()
            
            result = await client.transfer_funds(transfer_request)
            
            assert isinstance(result, TransferResponse)
            assert result.transaction_id == "txn_123456"
            assert result.status == "SUCCESS"
            assert result.amount == 100.50
            
            await client.close()
    
    @pytest.mark.asyncio
    async def test_transfer_invalid_account(self, config):
        """Test transfer with invalid account."""
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock invalid account response
            invalid_response = AsyncMock()
            invalid_response.status = 200
            invalid_response.json.return_value = {
                "accountId": "INVALID",
                "isValid": False
            }
            
            mock_session.request.return_value.__aenter__.return_value = invalid_response
            
            client = ModernBankingClient(config)
            await client.initialize()
            
            request = TransferRequest("INVALID", "ACC1001", 100.0)
            
            with pytest.raises(BankingClientError, match="Invalid source account"):
                await client.transfer_funds(request)
            
            await client.close()
    
    @pytest.mark.asyncio
    async def test_retry_mechanism(self, config):
        """Test retry mechanism for server errors."""
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock server error followed by success
            error_response = AsyncMock()
            error_response.status = 500
            
            success_response = AsyncMock()
            success_response.status = 200
            success_response.json.return_value = {"accountId": "ACC1000", "isValid": True}
            
            mock_session.request.return_value.__aenter__.side_effect = [
                error_response,
                success_response
            ]
            
            client = ModernBankingClient(config)
            await client.initialize()
            
            # Should succeed after retry
            result = await client.validate_account("ACC1000")
            assert result["isValid"] is True
            
            # Should have made 2 requests (original + 1 retry)
            assert mock_session.request.call_count == 2
            
            await client.close()
    
    @pytest.mark.asyncio
    async def test_network_error_handling(self, config):
        """Test network error handling."""
        with patch('aiohttp.ClientSession') as mock_session_class:
            mock_session = AsyncMock()
            mock_session_class.return_value = mock_session
            
            # Mock network error
            mock_session.request.side_effect = ClientError("Network error")
            
            client = ModernBankingClient(config)
            await client.initialize()
            
            with pytest.raises(BankingClientError, match="Network error"):
                await client.validate_account("ACC1000")
            
            await client.close()
    
    def test_performance_stats(self, config):
        """Test performance statistics tracking."""
        client = ModernBankingClient(config)
        
        stats = client.get_performance_stats()
        
        assert "uptime_seconds" in stats
        assert "total_requests" in stats
        assert "requests_per_second" in stats
        assert "config" in stats
        assert stats["total_requests"] == 0  # No requests made yet


# Integration tests (require running server)
class TestIntegration:
    """Integration tests - require actual server."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_real_server_validation(self):
        """Test against real server (if available)."""
        config = BankingConfig(base_url="http://localhost:8123")
        
        try:
            async with ModernBankingClient(config) as client:
                result = await client.validate_account("ACC1000")
                assert "isValid" in result
        except BankingClientError:
            pytest.skip("Server not available for integration test")
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_real_server_transfer(self):
        """Test real transfer against server (if available)."""
        config = BankingConfig(base_url="http://localhost:8123")
        
        try:
            async with ModernBankingClient(config) as client:
                request = TransferRequest("ACC1000", "ACC1001", 1.0, "Test transfer")
                result = await client.transfer_funds(request)
                assert result.status == "SUCCESS"
        except BankingClientError:
            pytest.skip("Server not available for integration test")


if __name__ == "__main__":
    # Run tests with coverage
    pytest.main([
        __file__,
        "-v",
        "--cov=banking_client",
        "--cov-report=html",
        "--cov-report=term-missing"
    ])