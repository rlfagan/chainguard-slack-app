# Configuration Guide

This guide explains all configuration options for the Chainguard Slack App.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Slack Configuration](#slack-configuration)
- [Chainguard Configuration](#chainguard-configuration)
- [Application Settings](#application-settings)
- [Advanced Configuration](#advanced-configuration)

## Environment Variables

All configuration is managed through environment variables, typically stored in a `.env` file.

### Required Variables

#### Slack Credentials

```env
# Bot User OAuth Token
# Obtained from: Slack App Settings > OAuth & Permissions
# Format: xoxb-...
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Signing Secret
# Obtained from: Slack App Settings > Basic Information > App Credentials
# Used to verify requests from Slack
SLACK_SIGNING_SECRET=your-signing-secret-here

# App-Level Token for Socket Mode
# Obtained from: Slack App Settings > Basic Information > App-Level Tokens
# Format: xapp-...
# Requires 'connections:write' scope
SLACK_APP_TOKEN=xapp-your-app-token-here
```

#### Chainguard Credentials

```env
# Chainguard Organization ID
# Find with: chainctl org ls
# Format: UUID-style identifier
CHAINGUARD_ORG_ID=a77871fcfc77ed549380eb0555edb82af4a266d4

# Chainguard API Token
# Generate with: chainctl auth token
# Note: Tokens expire and need rotation
CHAINCTL_TOKEN=your-chainctl-token-here

# Chainguard Registry URL
# Format: cgr.dev/<your-org-name>
CHAINGUARD_REGISTRY=cgr.dev/your-org-name
```

#### Application Settings

```env
# Application Port
# Default: 3001
PORT=3001

# Approver User IDs
# Comma-separated list of Slack user IDs
# Find with: Right-click user in Slack > Copy member ID
APPROVER_USER_IDS=U1234567890,U0987654321
```

### Optional Variables

```env
# Chainguard API URL (usually not needed)
# Default: https://console-api.enforce.dev
CHAINGUARD_API_URL=https://console-api.enforce.dev

# Chainguard APK Registry (currently unused)
CHAINGUARD_APK_REGISTRY=https://apk.cgr.dev/your-org-name

# Log Level (for future use)
LOG_LEVEL=info
```

## Complete .env Example

```env
# ===================
# Slack Configuration
# ===================
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN-HERE
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-YOUR-APP-TOKEN-HERE

# ========================
# Chainguard Configuration
# ========================
CHAINGUARD_ORG_ID=a77871fcfc77ed549380eb0555edb82af4a266d4
CHAINCTL_TOKEN=your-actual-chainctl-token-here
CHAINGUARD_REGISTRY=cgr.dev/demo.com
CHAINGUARD_API_URL=https://console-api.enforce.dev

# ======================
# Application Settings
# ======================
PORT=3001
APPROVER_USER_IDS=U01ABC123DE,U02DEF456GH
```

## Slack Configuration

### Getting Slack Credentials

#### 1. Create Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From an app manifest"
4. Select your workspace
5. Paste the contents of `manifest.json` from this repository
6. Click "Create"

#### 2. Get Bot Token

1. Go to "OAuth & Permissions" in your app settings
2. Click "Install to Workspace"
3. Authorize the app
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
5. Set as `SLACK_BOT_TOKEN` in `.env`

#### 3. Get Signing Secret

1. Go to "Basic Information" in your app settings
2. Under "App Credentials", find "Signing Secret"
3. Click "Show" and copy the value
4. Set as `SLACK_SIGNING_SECRET` in `.env`

#### 4. Enable Socket Mode and Get App Token

1. Go to "Socket Mode" in your app settings
2. Toggle "Enable Socket Mode" to ON
3. Go to "Basic Information" > "App-Level Tokens"
4. Click "Generate Token and Scopes"
5. Name it "Socket Mode Token"
6. Add the `connections:write` scope
7. Click "Generate"
8. Copy the token (starts with `xapp-`)
9. Set as `SLACK_APP_TOKEN` in `.env`

### Configuring Approvers

To find Slack user IDs for approvers:

**Method 1: Via Slack UI**
1. Right-click on a user's profile picture or name
2. Select "Copy member ID"
3. Add the ID to `APPROVER_USER_IDS` in `.env`

**Method 2: Via API**
```bash
curl -H "Authorization: Bearer YOUR_BOT_TOKEN" \
  https://slack.com/api/users.list | jq '.members[] | {id, name, real_name}'
```

**Method 3: Via App Logs**
When someone interacts with the app, their user ID appears in logs.

### Multiple Approvers

Separate multiple approver user IDs with commas (no spaces):

```env
APPROVER_USER_IDS=U01ABC123DE,U02DEF456GH,U03GHI789JK
```

### Slack Workspace Requirements

- You must have permission to install apps in your workspace
- The app requires the following OAuth scopes (defined in manifest.json):
  - `commands` - For slash commands
  - `chat:write` - To send messages
  - `chat:write.public` - To post in channels the app isn't a member of
  - `im:write` - To send direct messages
  - `im:history` - To read DM history
  - `users:read` - To get user information
  - `users:read.email` - To read user emails (optional)
  - `channels:read` - To list channels
  - `groups:read` - To list private channels
  - `im:read` - To list DMs
  - `mpim:read` - To list multi-person DMs
  - `app_mentions:read` - To receive mentions

## Chainguard Configuration

### Getting Chainguard Credentials

#### 1. Install chainctl

**macOS/Linux:**
```bash
curl -fsSL https://dl.enforce.dev/chainctl/install.sh | bash
```

**Manual download:**
Download from [https://dl.enforce.dev/chainctl/](https://dl.enforce.dev/chainctl/)

#### 2. Authenticate

```bash
chainctl auth login
```

This opens a browser for authentication.

#### 3. Find Your Organization ID

```bash
chainctl org ls
```

Output example:
```
                     ID                    |        NAME        
-------------------------------------------+--------------------
 a77871fcfc77ed549380eb0555edb82af4a266d4 | demo.com
```

Copy the ID and set as `CHAINGUARD_ORG_ID`.

#### 4. Get Registry Name

The registry format is always:
```
cgr.dev/<organization-name>
```

For example:
```env
CHAINGUARD_REGISTRY=cgr.dev/demo.com
```

#### 5. Generate API Token

For Docker/production deployments:

```bash
chainctl auth token
```

Copy the token and set as `CHAINCTL_TOKEN`.

**Important**: Tokens expire. For production, use assumable identities (service accounts) instead.

### Using Assumable Identities (Production)

For production deployments, use Chainguard assumable identities instead of tokens:

1. **Create an identity**:
   ```bash
   chainctl iam identities create slack-app-service \
     --parent=<org-id> \
     --description="Slack App Service Account"
   ```

2. **Grant permissions**:
   ```bash
   chainctl iam role-bindings create \
     --identity=<identity-id> \
     --role=owner \
     --parent=<org-id>
   ```

3. **Configure your deployment** to assume this identity
   See [Chainguard Identity Documentation](https://edu.chainguard.dev/chainguard/chainguard-enforce/authentication/identity-and-access-management/)

### Required Chainguard Permissions

The Chainguard identity/token needs these permissions:
- **List Repos**: View available image repositories
- **Get Build Config**: Read build configurations
- **Edit Build Config**: Create and modify custom images
- **List Builds**: Check build status
- **Describe Builds**: Get build details

## Application Settings

### Port Configuration

```env
PORT=3001
```

The application runs on this port. Default is 3001.

- For local development: Any available port works
- For Docker: Ensure docker-compose.yml maps the same port
- For production: Use standard ports (80, 443) with a reverse proxy

### Build Monitor Configuration

The build monitor polls for build completion every 5 minutes.

To change this, edit `services/build-monitor.js`:

```javascript
// Change 5 minutes to desired interval
const intervalId = setInterval(async () => {
  await this.checkForNewBuilds(...);
}, 5 * 60 * 1000); // 5 minutes in milliseconds
```

### Package Search Configuration

The package search has a curated list of common packages as fallback.

To modify, edit `services/package-search.js`:

```javascript
const commonPackages = [
  { name: 'curl', description: 'Command line tool...' },
  { name: 'wget', description: 'Network utility...' },
  // Add more packages here
];
```

## Advanced Configuration

### Custom Image Naming

Custom images are named based on the "Request Name" field in the Slack form.

The naming logic is in `services/chainguard-chainctl.js`:

```javascript
const customImageName = `${imageRequest.requestName}`.toLowerCase().replace(/\s+/g, '-');
```

### Datastore Configuration

Currently uses in-memory storage. To use a database:

1. Replace `services/datastore.js` with your database implementation
2. Maintain the same interface:
   - `storeRequest(request)`
   - `getRequest(id)`
   - `getAllRequests()`
   - `updateRequest(id, updates)`

Example with PostgreSQL:

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class Datastore {
  async storeRequest(request) {
    const result = await pool.query(
      'INSERT INTO requests (id, image_name, status, ...) VALUES ($1, $2, $3, ...) RETURNING *',
      [request.id, request.imageName, request.status, ...]
    );
    return result.rows[0];
  }
  // ... other methods
}
```

### Custom Assembly YAML Configuration

The YAML format for Chainguard Custom Assembly is:

```yaml
contents:
  packages:
    - package-name-1
    - package-name-2
```

This is generated in `services/chainguard-chainctl.js`:

```javascript
createBuildYaml(imageRequest) {
  const packages = imageRequest.packages && imageRequest.packages.length > 0
    ? imageRequest.packages.map(p => `    - ${p}`).join('\n')
    : '';

  return `# Custom Assembly Build Configuration
# ${imageRequest.description}

contents:
  packages:
${packages}
`;
}
```

### Slack Message Customization

To customize Slack messages, edit the blocks in:
- `listeners/shortcuts/request-image.js` - Request form
- `listeners/commands/list-requests.js` - List requests output
- `listeners/commands/search-packages.js` - Package search results
- `listeners/events/approval-actions.js` - Approval notifications

Slack uses [Block Kit](https://api.slack.com/block-kit) for rich messages.

### Environment-Specific Configuration

For different environments (dev, staging, production):

**.env.development**
```env
PORT=3001
CHAINGUARD_ORG_ID=dev-org-id
LOG_LEVEL=debug
```

**.env.production**
```env
PORT=3001
CHAINGUARD_ORG_ID=prod-org-id
LOG_LEVEL=error
```

Load with:
```bash
# Development
NODE_ENV=development npm start

# Production
NODE_ENV=production npm start
```

## Configuration Validation

The app validates configuration on startup. Check logs for:

```
✅ All listeners registered
⚡️ Chainguard Slack App is running on port 3001!
📦 Connected to Chainguard Org: <your-org-id>
🔐 Registry: cgr.dev/<your-org>
👥 Approvers configured: N
```

### Common Configuration Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing SLACK_BOT_TOKEN" | Token not set | Add to `.env` |
| "Missing CHAINCTL_TOKEN" | Token not set | Generate with `chainctl auth token` |
| "Invalid token" | Token expired or wrong | Regenerate token |
| "Organization not found" | Wrong org ID | Verify with `chainctl org ls` |
| "Socket connection failed" | Wrong app token | Check `SLACK_APP_TOKEN` |
| "Approvers configured: 0" | No approvers set | Add to `APPROVER_USER_IDS` |

## Security Best Practices

1. **Never commit `.env` files**: Already in `.gitignore`
2. **Use strong tokens**: Let Slack/Chainguard generate them
3. **Rotate tokens regularly**: Especially in production
4. **Limit approver access**: Only trusted users
5. **Use secrets management**: For production (AWS Secrets Manager, Vault, etc.)
6. **Restrict permissions**: Use least-privilege principle for Chainguard identity
7. **Monitor access**: Review logs for suspicious activity

## Troubleshooting Configuration

### Test Slack Connection

```bash
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "url": "https://yourworkspace.slack.com/",
  "team": "Your Workspace",
  "user": "chainguard-image-manager",
  ...
}
```

### Test Chainguard Connection

```bash
chainctl images repos list --parent=$CHAINGUARD_ORG_ID
```

Should list your image repositories.

### Verify Environment Variables

```bash
# Check all variables are set
env | grep SLACK_
env | grep CHAINGUARD_
env | grep CHAINCTL_

# Or check specific variables
echo $SLACK_BOT_TOKEN
echo $CHAINCTL_TOKEN
```

## Additional Resources

- [Slack API Documentation](https://api.slack.com/)
- [Slack Bot Token Scopes](https://api.slack.com/scopes)
- [Chainguard Documentation](https://edu.chainguard.dev/)
- [chainctl CLI Reference](https://edu.chainguard.dev/chainguard/chainctl/)
