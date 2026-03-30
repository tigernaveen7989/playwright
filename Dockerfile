# Multi-stage Docker build for Playwright tests
FROM mcr.microsoft.com/playwright:v1.54.1-focal as base

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# For API tests only (no browser dependencies)
FROM node:20-slim as api-agent
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "run", "test", "--", "--project=xml-api", "--project=json-api"]

# For browser tests (with Playwright browsers)
FROM base as browser-agent
CMD ["npm", "run", "test", "--", "--project=call-center"]

# For running all tests
FROM base as full-agent
CMD ["npm", "run", "test"]