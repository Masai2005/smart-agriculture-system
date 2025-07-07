FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ sqlite sqlite-dev

WORKDIR /app

# Copy package files. We'll use npm inside docker, so we only need package.json.
COPY package.json package-lock.json* ./

# Install dependencies using npm, ignoring peer dependency conflicts.
RUN npm install --legacy-peer-deps

# Copy the rest of your application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

# Build the application
RUN npm run build

# Expose ports
EXPOSE 3000 1883 9001

# Start command
CMD ["npm", "start"]
