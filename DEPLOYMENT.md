# Deployment Guide

This guide covers deploying the Chainguard Slack App in various environments.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Slack App Configuration](#slack-app-configuration)
- [Chainguard Authentication](#chainguard-authentication)
- [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- chainctl CLI installed
- Slack workspace with admin privileges
- Chainguard account and organization access

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd chainguard-slack-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install chainctl** (if not already installed):
   ```bash
   # macOS/Linux
   curl -fsSL https://dl.enforce.dev/chainctl/install.sh | bash

   # Or download from https://dl.enforce.dev/chainctl/
   ```

4. **Authenticate with Chainguard**:
   ```bash
   chainctl auth login
   ```

5. **Get your organization details**:
   ```bash
   chainctl org ls
   ```
   Note your organization ID for the `.env` file.

6. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials (see [CONFIGURATION.md](./CONFIGURATION.md) for details).

7. **Start the application**:
   ```bash
   npm start
   ```

8. **Verify connection**:
   You should see:
   ```
   ✅ All listeners registered
   ⚡️ Chainguard Slack App is running on port 3001!
   📦 Connected to Chainguard Org: <your-org-id>
   🔐 Registry: cgr.dev/<your-org>
   👥 Approvers configured: N
   [INFO]  socket-mode:SocketModeClient:0 Now connected to Slack
   ```

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Build and start the container**:
   ```bash
   docker compose up -d
   ```

2. **View logs**:
   ```bash
   docker compose logs -f
   ```

3. **Stop the container**:
   ```bash
   docker compose down
   ```

### Using Docker directly

1. **Build the image**:
   ```bash
   docker build -t chainguard-slack-app .
   ```

2. **Run the container**:
   ```bash
   docker run -d \
     --name chainguard-slack-app \
     --env-file .env \
     -p 3001:3001 \
     chainguard-slack-app
   ```

3. **View logs**:
   ```bash
   docker logs -f chainguard-slack-app
   ```

### Docker Deployment Notes

- The Dockerfile uses Chainguard's official Node.js image for security
- chainctl is installed during the build process
- Environment variables are loaded from `.env` via docker-compose
- The container runs as a non-root user for security

## Production Deployment

### Recommended Setup

For production environments, consider:

1. **Use Chainguard Assumable Identities** (service accounts)
2. **Deploy to a container platform** (Kubernetes, ECS, Cloud Run, etc.)
3. **Implement health checks**
4. **Set up monitoring and alerting**
5. **Use a persistent datastore** (replace in-memory storage)

### Using Chainguard Assumable Identities

For non-interactive authentication in production:

1. **Create an assumable identity**:
   ```bash
   chainctl iam identities create <identity-name> \
     --parent=<org-id> \
     --description="Slack App Service Account"
   ```

2. **Grant necessary permissions**:
   ```bash
   chainctl iam role-bindings create \
     --identity=<identity-id> \
     --role=<role> \
     --parent=<org-id>
   ```

3. **Use the identity in your deployment**:
   Instead of using `CHAINCTL_TOKEN`, configure your container to assume the identity.
   See [Chainguard Identity Documentation](https://edu.chainguard.dev/chainguard/chainguard-enforce/authentication/identity-and-access-management/).

### Kubernetes Deployment

Example Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chainguard-slack-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: chainguard-slack-app
  template:
    metadata:
      labels:
        app: chainguard-slack-app
    spec:
      containers:
      - name: app
        image: chainguard-slack-app:latest
        ports:
        - containerPort: 3001
        env:
        - name: SLACK_BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-credentials
              key: bot-token
        - name: SLACK_SIGNING_SECRET
          valueFrom:
            secretKeyRef:
              name: slack-credentials
              key: signing-secret
        - name: SLACK_APP_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-credentials
              key: app-token
        - name: CHAINCTL_TOKEN
          valueFrom:
            secretKeyRef:
              name: chainguard-credentials
              key: token
        - name: CHAINGUARD_ORG_ID
          value: "<your-org-id>"
        - name: CHAINGUARD_REGISTRY
          value: "cgr.dev/<your-org>"
        - name: PORT
          value: "3001"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: chainguard-slack-app
spec:
  selector:
    app: chainguard-slack-app
  ports:
  - port: 3001
    targetPort: 3001
```

### Cloud Deployment Examples

#### AWS ECS/Fargate

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker build -t chainguard-slack-app .
docker tag chainguard-slack-app:latest <account>.dkr.ecr.us-east-1.amazonaws.com/chainguard-slack-app:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/chainguard-slack-app:latest

# Create task definition and service via AWS console or CLI
```

#### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/<project-id>/chainguard-slack-app
gcloud run deploy chainguard-slack-app \
  --image gcr.io/<project-id>/chainguard-slack-app \
  --platform managed \
  --region us-central1 \
  --set-env-vars SLACK_BOT_TOKEN=<token>,SLACK_SIGNING_SECRET=<secret>,...
```

#### Azure Container Instances

```bash
# Build and push to ACR
az acr build --registry <registry-name> --image chainguard-slack-app:latest .

# Deploy
az container create \
  --resource-group <resource-group> \
  --name chainguard-slack-app \
  --image <registry-name>.azurecr.io/chainguard-slack-app:latest \
  --environment-variables SLACK_BOT_TOKEN=<token> SLACK_SIGNING_SECRET=<secret> ...
```

## Slack App Configuration

### Creating the Slack App

1. **Go to Slack API Portal**:
   Visit [https://api.slack.com/apps](https://api.slack.com/apps)

2. **Create New App**:
   - Click "Create New App"
   - Select "From an app manifest"
   - Choose your workspace
   - Copy the contents of `manifest.json` from this repository
   - Paste it into the YAML/JSON editor
   - Click "Create"

3. **Configure OAuth & Permissions**:
   - Go to "OAuth & Permissions"
   - The required scopes are already defined in the manifest
   - Click "Install to Workspace"
   - Authorize the app

4. **Enable Socket Mode**:
   - Go to "Socket Mode"
   - Toggle "Enable Socket Mode" to ON
   - This allows the app to use WebSocket connections instead of HTTP endpoints

5. **Create App-Level Token**:
   - Go to "Basic Information"
   - Scroll to "App-Level Tokens"
   - Click "Generate Token and Scopes"
   - Name it "Socket Mode Token"
   - Add the `connections:write` scope
   - Click "Generate"
   - Copy the token (starts with `xapp-`)

6. **Get Bot Token**:
   - Go to "OAuth & Permissions"
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)

7. **Get Signing Secret**:
   - Go to "Basic Information"
   - Under "App Credentials", copy the "Signing Secret"

8. **Configure Slash Commands** (if not using manifest):
   The following commands should be registered:
   - `/request-image` - Request a new Chainguard custom image
   - `/list-requests` - List all image requests
   - `/search-packages` - Search for available packages

   Note: These are automatically configured if you used the manifest.

9. **Add Approver User IDs**:
   - In Slack, right-click on each approver's profile
   - Select "Copy member ID"
   - Add the IDs to your `.env` file in `APPROVER_USER_IDS`

### Updating the Slack App

If you need to add new commands or features:

1. Update `manifest.json` in your repository
2. Go to your Slack App configuration
3. Click "App Manifest"
4. Paste the updated manifest
5. Click "Save Changes"
6. Reinstall the app if prompted

## Chainguard Authentication

### Local Development

For local development, use interactive authentication:

```bash
chainctl auth login
```

This will open a browser for authentication. The session is stored locally.

### Docker/Production

For Docker and production environments, you have two options:

#### Option 1: API Token (Simpler, less secure)

1. Generate an API token:
   ```bash
   chainctl auth token
   ```

2. Add to `.env`:
   ```env
   CHAINCTL_TOKEN=<your-token>
   ```

Note: API tokens have an expiration. You'll need to rotate them periodically.

#### Option 2: Assumable Identity (Recommended for production)

1. Create a service account (assumable identity) in Chainguard
2. Configure your deployment environment to assume that identity
3. No token needed in environment variables

See [Chainguard Identity Documentation](https://edu.chainguard.dev/chainguard/chainguard-enforce/authentication/identity-and-access-management/) for detailed instructions.

### Required Permissions

The Chainguard identity/token needs the following permissions:
- List image repositories
- Create/edit build configurations
- List builds
- Describe build details

## Health Checks

The app doesn't currently expose a health check endpoint. For production deployments, consider adding:

```javascript
// In app.js
app.express.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

## Monitoring and Logging

### Logging

The app logs to stdout. Key log patterns:

- `✅ All listeners registered` - App started successfully
- `Now connected to Slack` - Socket Mode connection established
- `[PackageSearch]` - Package search operations
- `Creating custom assembly` - Image creation started
- `Error` - Error conditions

### Recommended Monitoring

Monitor these metrics:
- App uptime
- Socket Mode connection status
- Request success/failure rates
- Build completion times
- Error rates

Consider using:
- **Application Performance Monitoring**: New Relic, Datadog, etc.
- **Log Aggregation**: CloudWatch, Stackdriver, ELK Stack
- **Alerting**: PagerDuty, Opsgenie

## Troubleshooting

### App fails to start

**Check Node.js version**:
```bash
node --version  # Should be 18+
```

**Check environment variables**:
```bash
cat .env  # Verify all required variables are set
```

### Cannot connect to Slack

**Verify Socket Mode is enabled**:
- Check Slack App settings
- Ensure `SLACK_APP_TOKEN` is correct (starts with `xapp-`)

**Check logs for connection errors**:
```bash
# Docker
docker compose logs -f

# Local
npm start
```

### chainctl commands fail

**Verify chainctl is installed**:
```bash
chainctl version
```

**Check authentication**:
```bash
# Local development
chainctl auth login

# Docker/Production
echo $CHAINCTL_TOKEN  # Should be set
```

**Test chainctl access**:
```bash
chainctl images repos list --parent=<your-org-id>
```

### Commands not appearing in Slack

1. **Verify app is installed**: Go to Slack App directory in your workspace
2. **Check manifest**: Ensure commands are defined in `manifest.json`
3. **Reinstall app**: Sometimes Slack needs the app to be reinstalled after changes

### Build monitoring not working

- Check that custom image names are correct
- Verify polling interval (default: 5 minutes)
- Check logs for monitoring errors
- Ensure chainctl can list builds:
  ```bash
  chainctl images repos build list --parent=<your-org-id> --repo=<custom-image-name>
  ```

### Docker build fails

**Clear Docker cache**:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

**Check Docker logs**:
```bash
docker compose logs -f
```

## Security Considerations

1. **Never commit `.env` files**: Already in `.gitignore`
2. **Rotate tokens regularly**: Especially in production
3. **Use secrets management**: For production (AWS Secrets Manager, Vault, etc.)
4. **Limit approver access**: Only add trusted users to `APPROVER_USER_IDS`
5. **Review image requests**: Approvers should validate requested packages
6. **Monitor API usage**: Watch for unusual patterns
7. **Keep dependencies updated**: Run `npm audit` regularly

## Backup and Recovery

### In-Memory Datastore

The current implementation uses in-memory storage. If the app restarts, request history is lost.

For production, consider implementing persistent storage:
- PostgreSQL
- MongoDB
- Redis with persistence enabled

### Exporting Request History

Currently, request data is only available via `/list-requests` in Slack.

To export programmatically, you could add an admin endpoint or database export.

## Scaling Considerations

- **Single Instance**: The current app is designed to run as a single instance due to in-memory storage
- **Horizontal Scaling**: Would require replacing in-memory storage with a shared datastore
- **Rate Limiting**: Consider implementing rate limits for Slack commands
- **Queue System**: For high-volume deployments, consider adding a job queue (Bull, SQS, etc.)

## Updates and Maintenance

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Check for security vulnerabilities
npm audit
npm audit fix
```

### Updating chainctl

```bash
# Update chainctl to latest version
curl -fsSL https://dl.enforce.dev/chainctl/install.sh | bash
```

### Deploying Updates

1. Test changes locally
2. Update version in `package.json`
3. Build new Docker image
4. Deploy to production environment
5. Monitor logs for errors
6. Test key functionality

## Support

For deployment issues:
- Check this documentation
- Review application logs
- Check [Slack API Status](https://status.slack.com/)
- Check [Chainguard Status](https://status.chainguard.dev/)
- Open an issue in the repository

## Additional Resources

- [Slack Bolt.js Documentation](https://slack.dev/bolt-js/)
- [Slack Socket Mode](https://api.slack.com/apis/connections/socket)
- [Chainguard Documentation](https://edu.chainguard.dev/)
- [chainctl CLI Reference](https://edu.chainguard.dev/chainguard/chainctl/)
- [Docker Documentation](https://docs.docker.com/)
