# Stage 1: Build the frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build frontend
COPY . .
RUN npm run build

# Stage 2: Run the application
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies
# (This includes typescript and tsx now)
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
# Copy server source
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Cloud Run sets the PORT environment variable (default 8080)
ENV NODE_ENV=production

# Start the server using tsx directly
# npx will find tsx in node_modules/.bin
CMD ["npx", "tsx", "server.ts"]
