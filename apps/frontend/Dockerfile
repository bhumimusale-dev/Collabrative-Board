# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Pass environment variable at build-time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build the project
RUN npm run build

# Stage 2: Serve static output with Nginx
FROM nginx:alpine

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to HTML directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
