# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Run the Express server
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
# Copy server source and other necessary files
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Install tsx globally or use it from node_modules
RUN npm install -g tsx

# Cloud Run sets the PORT environment variable (default 8080)
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Start the server
CMD ["tsx", "server.ts"]
