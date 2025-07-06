# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install mosquitto MQTT broker
RUN apk add --no-cache mosquitto mosquitto-clients

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/data ./data

# Copy MQTT configuration
COPY mosquitto.conf /etc/mosquitto/mosquitto.conf

# Create mosquitto directories
RUN mkdir -p /var/lib/mosquitto /var/log/mosquitto
RUN chown -R mosquitto:mosquitto /var/lib/mosquitto /var/log/mosquitto

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose ports
EXPOSE 3000 1883 9001

# Create startup script
COPY --chown=nextjs:nodejs start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]
