# =============================================================================
# Stage 1: Builder
# Install all dependencies and compile TypeScript to JavaScript
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install all deps (including devDeps needed for tsc)
RUN npm ci

# Copy source files
COPY . .

# Generate env.ts from example (required for tsc)
RUN cp src/config/env.example.ts src/config/env.ts

# Compile TypeScript + copy Handlebars templates
RUN npm run build

# =============================================================================
# Stage 2: Production runner
# Only ships the compiled output + production dependencies
# =============================================================================
FROM node:22-alpine AS runner

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Ensure logs directory exists and is writable
RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
