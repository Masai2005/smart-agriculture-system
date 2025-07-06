FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ sqlite sqlite-dev

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install dependencies using pnpm with shamefully-hoist for better compatibility
RUN pnpm install --shamefully-hoist

# Explicitly install sqlite3 with npm as a fallback
RUN npm install sqlite3

# Copy source code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Skip build step - we'll build at runtime
# RUN pnpm run build

# Expose ports
EXPOSE 3000 1883 9001

# Start command
CMD ["pnpm", "start"]
