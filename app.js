import pkg from '@slack/bolt';
const { App } = pkg;
import { config, validateConfig } from './config/index.js';
import { registerListeners } from './listeners/index.js';

// Validate configuration before starting
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error.message);
  process.exit(1);
}

const app = new App({
  token: config.slack.botToken,
  signingSecret: config.slack.signingSecret,
  socketMode: true,
  appToken: config.slack.appToken,
  port: config.slack.port
});

// Register all listeners
registerListeners(app);

// Start the app
(async () => {
  await app.start(config.slack.port);
  console.log(`⚡️ Chainguard Slack App is running on port ${config.slack.port}!`);
  console.log(`📦 Connected to Chainguard Org: ${config.chainguard.orgId}`);
  console.log(`🔐 Registry: ${config.chainguard.registry}`);
  console.log(`👥 Approvers configured: ${config.app.approverUserIds.length}`);
})();
