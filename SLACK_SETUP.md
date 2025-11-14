# Slack App Setup Guide

This guide walks you through setting up the Chainguard Image Manager Slack app in your workspace with screenshots and detailed steps.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Create Slack App](#step-1-create-slack-app)
- [Step 2: Configure App Manifest](#step-2-configure-app-manifest)
- [Step 3: Get App Credentials](#step-3-get-app-credentials)
- [Step 4: Enable Socket Mode](#step-4-enable-socket-mode)
- [Step 5: Install to Workspace](#step-5-install-to-workspace)
- [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
- [Step 7: Test the App](#step-7-test-the-app)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Slack workspace where you have permission to install apps
- Admin or Owner role in the Slack workspace
- Access to https://api.slack.com/apps

## Step 1: Create Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From an app manifest"**
4. Choose your workspace from the dropdown
5. Click **"Next"**

## Step 2: Configure App Manifest

1. In the manifest editor, select the **JSON** tab
2. Copy the entire contents of `manifest.json` from this repository
3. Paste it into the editor, replacing the default content
4. Click **"Next"**
5. Review the app configuration summary
6. Click **"Create"**

### Key Manifest Features

The manifest includes:
- **Display Information**: App name "Chainguard Image Manager" with description
- **Slash Commands**: `/request-image`, `/list-requests`, `/search-packages`
- **Shortcuts**: Global shortcut for requesting images
- **Bot Scopes**: All necessary permissions for messaging and user management
- **Event Subscriptions**: Listens for app mentions and direct messages
- **Socket Mode**: Enabled for WebSocket-based communication

## Step 3: Get App Credentials

After creating the app, you'll see the **Basic Information** page with your app credentials.

### Required Credentials:

#### 1. **App ID** and **Client ID**
- Located under "App Credentials" section
- Used for identification (not needed in .env)

#### 2. **Client Secret**
- Click "Show" to reveal
- Click "Copy" to copy to clipboard
- **Note**: Not actively used by this app, but keep it secure

#### 3. **Signing Secret** ⚠️ REQUIRED
- Located under "App Credentials"
- Click "Show" and copy
- Add to your `.env` file as:
  ```env
  SLACK_SIGNING_SECRET=your-signing-secret-here
  ```

#### 4. **Verification Token**
- Also under "App Credentials"
- Not needed for Socket Mode apps

## Step 4: Enable Socket Mode

Socket Mode allows your app to use WebSocket connections instead of HTTP endpoints.

1. In the left sidebar, click **"Socket Mode"**
2. Toggle **"Enable Socket Mode"** to **ON**
3. You'll be prompted to create an App-Level Token

### Create App-Level Token:

1. Click **"Generate Token and Scopes"**
2. Enter a token name: `Socket Mode Token`
3. Add the scope: `connections:write`
4. Click **"Generate"**
5. **Copy the token** (starts with `xapp-`) ⚠️ You won't see it again!
6. Add to your `.env` file as:
   ```env
   SLACK_APP_TOKEN=xapp-your-app-token-here
   ```

## Step 5: Install to Workspace

1. In the left sidebar, click **"Install App"**
2. Click **"Install to Workspace"**
3. Review the permissions the app is requesting
4. Click **"Allow"**

### Get Bot Token:

After installation, you'll see the **OAuth & Permissions** page.

1. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)
2. Add to your `.env` file as:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-bot-token-here
   ```

## Step 6: Configure Environment Variables

Create a `.env` file in the project root with all required variables:

```env
# ===================
# Slack Configuration
# ===================
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# ========================
# Chainguard Configuration
# ========================
CHAINGUARD_ORG_ID=your-chainguard-org-id
CHAINCTL_TOKEN=your-chainctl-token
CHAINGUARD_REGISTRY=cgr.dev/your-org-name

# =======================
# Application Configuration
# =======================
PORT=3001
APPROVER_USER_IDS=U01ABC123DE,U02DEF456GH
```

### Getting Chainguard Credentials

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed Chainguard setup instructions.

### Getting Approver User IDs

**Method 1: Via Slack UI**
1. Right-click on a user's profile in Slack
2. Click "Copy member ID"
3. Add to `APPROVER_USER_IDS` (comma-separated)

**Method 2: Via Slack API**
```bash
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  https://slack.com/api/users.list
```

## Step 7: Test the App

### Start the Application

```bash
# Local
npm start

# Docker
docker compose up -d
```

You should see:
```
✅ All listeners registered
⚡️ Chainguard Slack App is running on port 3001!
📦 Connected to Chainguard Org: <your-org-id>
🔐 Registry: cgr.dev/<your-org>
👥 Approvers configured: N
[INFO]  socket-mode:SocketModeClient:0 Now connected to Slack
```

### Test Commands in Slack

1. **Test Package Search**:
   - In any channel or DM with the bot, type: `/search-packages python`
   - You should see package results like `python-3.13` and `python-3.14`

2. **Test Image Request**:
   - Type: `/request-image`
   - Fill out the modal form
   - Submit the request
   - Check that approvers receive a notification

3. **Test Approval Workflow**:
   - As an approver, click "Approve" or "Reject"
   - Verify the requester receives a notification
   - Check that the build configuration is applied

## Expected Behavior

### Package Search Results

When you search for packages with `/search-packages python`, you should see:

```
🔍 Package Search Results for "python"

Found 2 packages

python-3.13 - vlatest
Python programming language (3.13)

python-3.14 - vlatest
Python programming language (3.14)

ℹ️ Showing common packages. For a full package search, you can browse https://packages.wolfi.dev
```

### Image Request Flow

1. **Requester submits request**:
   - Modal opens with form fields
   - Enter Request Name: `custom`
   - Select Base Repo: `go`
   - Add Packages: `wget`
   - Add Description and Justification

2. **Approver receives notification**:
   - DM from bot with request details
   - "Approve" and "Reject" buttons visible

3. **After Approval**:
   - Requester sees "Your image request has been approved!"
   - Status shows "Applying build configuration..."
   - System checks for existing images with same packages
   - If no match, creates new custom image
   - Shows Chainguard response with YAML diff

4. **Build Configuration Applied**:
   ```
   ✅ Configuration Applied
   
   Request ID: req_1763153851985_5g5h91194
   Custom Image Name: custom
   Packages: wget
   
   Chainguard Response:
   /var/folders/4z/_v7qpf9s03gf684sybpqyh6c0000gn/T/2469601468.yaml (-deletion / +addition):
   
   -{}
   +# Custom Assembly Build Configuration
   +# test
   
   +contents:
   +  packages:
   +    - wget
   +
   
   ✅ Build configuration applied successfully
   ```

5. **Custom Image Available**:
   - Check Chainguard console
   - New custom image appears in organization images list
   - Status shows "Customized"
   - Image URL: `cgr.dev/ronan_demo.com/custom:v1.25.4`

## App Configuration Summary

### Slash Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/request-image` | Request a new custom image | `/request-image [name]` |
| `/list-requests` | List all image requests | `/list-requests [status]` |
| `/search-packages` | Search for packages | `/search-packages [term]` |

### Global Shortcuts

- **Request Chainguard Image**: Opens request modal from anywhere in Slack

### Bot Scopes

The app requires these permissions:
- `commands` - Execute slash commands
- `chat:write` - Send messages
- `chat:write.public` - Post in public channels
- `im:write`, `im:history` - Direct message access
- `users:read`, `users:read.email` - User information
- `channels:read`, `groups:read` - Channel access
- `app_mentions:read` - Respond to mentions

### Event Subscriptions

- `app_mention` - Bot is mentioned in a channel
- `message.im` - Bot receives a direct message

## Troubleshooting

### App Not Responding

**Problem**: Commands don't work or bot doesn't respond

**Solutions**:
1. Verify Socket Mode is enabled
2. Check that `SLACK_APP_TOKEN` is correct (starts with `xapp-`)
3. Ensure the app process is running (`npm start` or `docker compose ps`)
4. Check logs for connection errors

### "Unknown Command" Error

**Problem**: Slash commands show as unknown

**Solutions**:
1. Verify commands are in the App Manifest
2. Check Slack App Settings > "Slash Commands"
3. Reinstall the app to workspace
4. Wait 1-2 minutes for Slack to propagate changes

### "Dispatch Failed" Error

**Problem**: Commands fail with `dispatch_failed`

**Solutions**:
1. Check Socket Mode connection in logs
2. Verify bot token is valid
3. Restart the application
4. Check network connectivity

### Approval Buttons Don't Work

**Problem**: Clicking Approve/Reject does nothing

**Solutions**:
1. Check that Interactivity is enabled (in manifest)
2. Verify Socket Mode is connected
3. Check logs for action handler errors
4. Ensure request ID is valid

### No Package Search Results

**Problem**: `/search-packages` returns no results

**Solutions**:
1. Try searching without a term to see popular packages
2. Check that package-search service is working
3. Verify the search term (use simpler terms like "python" not "python3.14")
4. Check logs for search errors

### chainctl Errors

**Problem**: "Build configuration failed" or chainctl errors

**Solutions**:
1. Verify `CHAINCTL_TOKEN` is set and valid
2. Check `CHAINGUARD_ORG_ID` is correct
3. Test chainctl locally: `chainctl auth login && chainctl org ls`
4. Ensure token has necessary permissions
5. Check Chainguard console for repo access

### Build Not Completing

**Problem**: Build status shows "building" but never completes

**Explanation**: Chainguard builds on their own schedule (typically within a few hours).

**Notes**:
- The app polls every 5 minutes for build completion
- First check happens after 2 minutes
- Check Chainguard console for actual build status
- Builds may take 1-4 hours depending on complexity

## Support

For issues:
- Check the [main README](./README.md) for general information
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment issues
- See [CONFIGURATION.md](./CONFIGURATION.md) for configuration help
- Check application logs for specific errors
- Visit [Slack API Status](https://status.slack.com/)
- Visit [Chainguard Documentation](https://edu.chainguard.dev/)

## Additional Resources

- [Slack Bolt.js Documentation](https://slack.dev/bolt-js/)
- [Slack Socket Mode Guide](https://api.slack.com/apis/connections/socket)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/custom-images/)
- [chainctl CLI Reference](https://edu.chainguard.dev/chainguard/chainctl/)
