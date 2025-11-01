# Multi-stage Node.js Dockerfile
FROM node:18-alpine as base

# Set environment variables
ENV NODE_ENV=production

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -G appuser

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Install dependencies stage
FROM base as dependencies

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base as production

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "import('./banking-client.js').then(m => m.createBankingClient().healthCheck())" || exit 1

# Expose port (if running as a service)
EXPOSE 3000

# Default command
CMD ["node", "cli.js", "--help"]