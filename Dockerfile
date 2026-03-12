# Stage 1: Build the React application
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the Nginx configuration template
# The official Nginx image automatically substitutes environment variables 
# in this template and outputs it to /etc/nginx/conf.d/default.conf on startup.
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Cloud Run sets the PORT environment variable (default 8080)
ENV PORT=8080
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
