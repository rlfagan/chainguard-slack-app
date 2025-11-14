# Stage 1: Download chainctl
FROM cgr.dev/chainguard/wolfi-base:latest AS chainctl-downloader

# Install curl and download chainctl
# Map aarch64 to arm64 for chainctl download
RUN apk add --no-cache curl && \
    ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi && \
    curl -o /tmp/chainctl "https://dl.enforce.dev/chainctl/latest/chainctl_linux_${ARCH}" && \
    chmod +x /tmp/chainctl

# Stage 2: Build the application
FROM cgr.dev/ronan_demo.com/node:latest-dev

# Switch to root to copy chainctl and install dependencies
USER root

# Copy chainctl from downloader stage
COPY --from=chainctl-downloader /tmp/chainctl /usr/local/bin/chainctl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Set ownership for node user (Chainguard images use nonroot user with UID 65532)
RUN chown -R 65532:65532 /app

# Switch to non-root user
USER 65532

# Expose port
EXPOSE 3001

# Start application
ENTRYPOINT ["/usr/bin/node"]
CMD ["app.js"]
