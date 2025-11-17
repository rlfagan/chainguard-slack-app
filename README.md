# Chainguard Image Manager Slack App

A comprehensive Slack application for managing Chainguard custom container images. Submit requests, get approvals, and track the build status of your custom images directly from Slack.

## Features

- **Image Request System**: Submit requests for new Chainguard custom images via Slack shortcuts or slash commands
- **Approval Workflow**: Designated approvers can review and approve/reject requests with feedback
- **Custom Image Creation**: Automatically creates custom images using Chainguard Custom Assembly with `chainctl`
- **Real-time Build Monitoring**: Get notified when your custom image build completes
- **Duplicate Prevention**: Checks existing custom images to avoid creating duplicates
- **Package Search**: Search for available packages to add to your images with `/search-packages`
- **Status Tracking**: View all image requests and their current status
- **Real Success Reporting**: Shows actual status (new image created vs. already up-to-date)

## Architecture

This application uses:
- **Slack Bolt.js Framework** (Node.js) for Slack integration
- **Socket Mode** for WebSocket-based communication (no public URL needed)
- **chainctl CLI** for Chainguard operations (not REST API)
- **Docker** for containerized deployment using Chainguard Node.js images
- **In-memory datastore** for request tracking (configurable for production)
- **Build Monitor Service** for polling build completion status

## Prerequisites

- Node.js 18+ or Docker
- A Slack workspace where you can install apps
- Chainguard account with organization access
- chainctl CLI installed (for local development) or Docker
- Chainguard organization ID and authentication token

## Setup

### 1. Clone and Install Dependencies

```bash
cd chainguard-slack-app
npm install
```

### 2. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From a manifest"
3. Select your workspace
4. Copy the contents of `manifest.json` and paste it
5. Click "Create"
6. Go to "Install App" and install it to your workspace

### 3. Get Slack Credentials

After creating the app, collect the following:

- **Bot Token**: Go to "OAuth & Permissions" → copy the "Bot User OAuth Token" (starts with `xoxb-`)
- **Signing Secret**: Go to "Basic Information" → "App Credentials" → copy "Signing Secret"
- **App Token**: Go to "Basic Information" → scroll to "App-Level Tokens" → click "Generate Token and Scopes"
  - Add `connections:write` scope
  - Name it "Socket Mode Token"
  - Copy the token (starts with `xapp-`)

### 4. Get Chainguard Credentials

You'll need the following from your Chainguard setup:

- **Organization ID**: Your Chainguard org ID (e.g., `aaaa1111bbbb2222cccc3333dddd4444eeee5555`)
- **API Token**: Generate an API token from the Chainguard console
- **Registry URL**: Your custom registry (e.g., `cgr.dev/demo.com`)
- **APK Registry URL**: Your APK registry (e.g., `https://apk.cgr.dev/demo.com`)

To get your organization details:
```bash
chainctl org ls
```

### 5. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Slack App Credentials
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
SLACK_SIGNING_SECRET=your-actual-signing-secret
SLACK_APP_TOKEN=xapp-your-actual-app-token

# Chainguard API Configuration
CHAINGUARD_API_URL=https://console-api.enforce.dev
CHAINGUARD_API_TOKEN=your-chainguard-api-token
CHAINGUARD_ORG_ID=aaaa1111bbbb2222cccc3333dddd4444eeee5555
CHAINGUARD_REGISTRY=cgr.dev/demo.com
CHAINGUARD_APK_REGISTRY=https://apk.cgr.dev/demo.com

# App Configuration
PORT=3000
APPROVER_USER_IDS=U1234567890,U0987654321
```

### 6. Get Slack User IDs for Approvers

To find Slack user IDs:
1. Right-click on a user's profile in Slack
2. Select "Copy member ID"
3. Add multiple IDs separated by commas in `APPROVER_USER_IDS`

Or use the Slack API:
```bash
curl -H "Authorization: Bearer YOUR_BOT_TOKEN" \
  https://slack.com/api/users.list
```

### 7. Enable Socket Mode

In your Slack app configuration:
1. Go to "Socket Mode"
2. Toggle "Enable Socket Mode" to ON
3. The app will use the App Token for WebSocket connection

## Running the App

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

You should see:
```
✅ All listeners registered
⚡️ Chainguard Slack App is running on port 3000!
📦 Connected to Chainguard Org: aaaa1111bbbb2222cccc3333dddd4444eeee5555
🔐 Registry: cgr.dev/demo.com
👥 Approvers configured: 2
```

## Usage

### Requesting a Custom Image

**Method 1: Global Shortcut**
1. Click the lightning bolt icon in Slack (shortcuts menu)
2. Type "Request Chainguard Image"
3. Fill out the form:
   - Image Name
   - Base Image
   - Additional Packages (optional)
   - Description
   - Business Justification
4. Click "Submit"

**Method 2: Slash Command**
```
/request-image my-custom-app
```
This will open the same form with the image name pre-filled.

### Viewing Your Requests

List all your requests:
```
/list-requests
```

Filter by status:
```
/list-requests pending
/list-requests approved
/list-requests rejected
```

### Searching for Packages

Search for available packages to add to your images:
```
/search-packages python
/search-packages wget
/search-packages node
```

Show popular packages by category:
```
/search-packages
```

### Approving/Rejecting Requests (Approvers Only)

1. Approvers will receive a DM with the request details
2. Click "Approve" to approve and trigger the build
3. Click "Reject" to reject and provide a reason
4. The requester will be notified of the decision

### Request Status Flow

1. **pending** - Request submitted, awaiting approval
2. **approved** - Approved by an approver
3. **checking** - Checking for existing images with same packages
4. **existing_image_found** - An existing image already has the requested packages
5. **building** - New custom image configuration applied, waiting for build
6. **completed** - Image built successfully and available
7. **no_changes** - Configuration was already up-to-date
8. **rejected** - Request rejected by an approver
9. **failed** - Operation failed (error from chainctl)

## Project Structure

```
chainguard-slack-app/
├── app.js                          # Main application entry point
├── config/
│   └── index.js                    # Configuration management
├── services/
│   ├── chainguard-chainctl.js      # Chainguard client (via chainctl CLI)
│   ├── datastore.js                # In-memory request data storage
│   ├── build-monitor.js            # Build completion monitoring service
│   └── package-search.js           # Package search service
├── listeners/
│   ├── index.js                    # Listener registration
│   ├── shortcuts/
│   │   └── request-image.js        # Image request shortcut & modal
│   ├── commands/
│   │   ├── request-image.js        # /request-image command
│   │   ├── list-requests.js        # /list-requests command
│   │   └── search-packages.js      # /search-packages command
│   └── events/
│       └── approval-actions.js     # Approve/reject button handlers
├── manifest.json                   # Slack app manifest
├── docker-compose.yml              # Docker Compose configuration
├── Dockerfile                      # Container build configuration
├── package.json
├── .env.example
├── DEPLOYMENT.md                   # Deployment documentation
├── CONFIGURATION.md                # Configuration documentation
├── FINDINGS.md                     # Technical discoveries and notes
└── README.md
```

## Customization

### Using a Database

The current implementation uses an in-memory datastore. For production, replace `services/datastore.js` with a proper database:

- **PostgreSQL**: Use `pg` package
- **MongoDB**: Use `mongodb` or `mongoose`
- **Redis**: Use `redis` package

### Modifying the Approval Flow

To customize the approval workflow:
1. Edit `listeners/events/approval-actions.js`
2. Modify the button actions or add additional steps
3. Update the Chainguard API integration in `services/chainguard.js`

### Adding More Slack Commands

1. Add the command to `manifest.json`
2. Create a new file in `listeners/commands/`
3. Register it in `listeners/index.js`

## Troubleshooting

### App not responding
- Check that Socket Mode is enabled
- Verify your `SLACK_APP_TOKEN` is correct
- Ensure the app is running (`npm start`)

### Approval messages not appearing
- Verify `APPROVER_USER_IDS` contains valid Slack user IDs
- Check the approver IDs are comma-separated with no spaces (or spaces are trimmed)

### Chainguard API errors
- Verify your `CHAINGUARD_API_TOKEN` is valid
- Check the `CHAINGUARD_ORG_ID` is correct
- Ensure you have permissions to create custom assemblies

### Image build fails
- Check the Chainguard API response for specific errors
- Verify the base image name is correct
- Ensure package names are valid

## API Reference

### Chainguard Client (`services/chainguard.js`)

#### `createCustomAssembly(imageRequest)`
Creates a new custom assembly via Chainguard API.

**Parameters:**
- `imageRequest.name` - Name of the custom image
- `imageRequest.baseImage` - Base image to use
- `imageRequest.packages` - Array of package names
- `imageRequest.description` - Image description

**Returns:** `{ success: boolean, data?: object, error?: string }`

#### `listBaseImages()`
Lists available base images.

#### `getAssemblyStatus(assemblyId)`
Gets the status of a custom assembly.

#### `deleteCustomAssembly(assemblyId)`
Deletes a custom assembly.

## Security Considerations

- Keep your `.env` file secure and never commit it to version control
- Rotate your Slack and Chainguard tokens regularly
- Use environment variables for all sensitive data
- Consider implementing role-based access control for approvers
- Validate and sanitize all user inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues related to:
- **Slack integration**: Check [Slack API documentation](https://api.slack.com/)
- **Chainguard CTL**: Check [Chainguard documentation](https://edu.chainguard.dev/chainguard/chainctl/chainctl-docs/chainctl/)
- **This app**: Open an issue in the repository


- [ ] Multi-organization support
