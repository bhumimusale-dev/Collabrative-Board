# Stage 1: Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy dependency configs
COPY go.mod go.sum ./
RUN go mod download

# Copy backend source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

# Stage 2: Final lightweight image
FROM alpine:latest

WORKDIR /app

# Install ca-certificates in case they are needed for SSL/SMTP connections
RUN apk --no-cache add ca-certificates

# Create directories for persistent DB storage and static uploads
RUN mkdir -p /app/data /app/uploads

# Copy server binary
COPY --from=builder /app/server .

# Expose Go API port
EXPOSE 8080

# Run server
CMD ["./server"]
