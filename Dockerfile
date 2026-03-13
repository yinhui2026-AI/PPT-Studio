# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the React frontend
RUN npm run build

# Compile the server (using tsc)
# We need to make sure tsc is available and configured for ESM
RUN npx tsc server.ts --target es2022 --module esnext --moduleResolution bundler --outDir dist-server --esModuleInterop --skipLibCheck

# Stage 2: Run the application
FROM node:22-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
# Copy compiled server
COPY --from=builder /app/dist-server/server.js ./server.js

# Cloud Run sets the PORT environment variable (default 8080)
ENV NODE_ENV=production

# Start the server using node
CMD ["node", "server.js"]
