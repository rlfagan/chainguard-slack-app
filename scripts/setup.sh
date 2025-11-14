#!/bin/bash

echo "🚀 Chainguard Slack App Setup"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file with your actual credentials:"
    echo "   - Slack tokens (SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN)"
    echo "   - Chainguard tokens (CHAINGUARD_API_TOKEN, CHAINGUARD_ORG_ID)"
    echo "   - Registry URLs (CHAINGUARD_REGISTRY, CHAINGUARD_APK_REGISTRY)"
    echo "   - Approver user IDs (APPROVER_USER_IDS)"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your credentials"
echo "2. Run 'npm start' to start the app"
echo "3. Or run 'npm run dev' for development mode with auto-reload"
echo ""
