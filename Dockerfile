# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the project
RUN npm run build

# Use a smaller runtime image
FROM node:18-alpine

WORKDIR /app

# Copy package files and production dependencies from the builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/GeoLite2-City.mmdb ./

# Copy the compiled files
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 3500

# Start the app
CMD ["node", "dist/index.js"] 