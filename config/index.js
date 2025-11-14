import 'dotenv/config';

const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 3000
  },
  chainguard: {
    apiUrl: process.env.CHAINGUARD_API_URL || 'https://console-api.enforce.dev',
    apiToken: process.env.CHAINGUARD_API_TOKEN,
    orgId: process.env.CHAINGUARD_ORG_ID,
    registry: process.env.CHAINGUARD_REGISTRY || 'cgr.dev',
    apkRegistry: process.env.CHAINGUARD_APK_REGISTRY
  },
  app: {
    approverUserIds: process.env.APPROVER_USER_IDS?.split(',').map(id => id.trim()) || []
  }
};

// Validate required configuration
function validateConfig() {
  const required = [
    { key: 'SLACK_BOT_TOKEN', value: config.slack.botToken },
    { key: 'SLACK_SIGNING_SECRET', value: config.slack.signingSecret },
    { key: 'SLACK_APP_TOKEN', value: config.slack.appToken },
    { key: 'CHAINGUARD_API_TOKEN', value: config.chainguard.apiToken },
    { key: 'CHAINGUARD_ORG_ID', value: config.chainguard.orgId },
    { key: 'CHAINGUARD_REGISTRY', value: config.chainguard.registry }
  ];

  const missing = required.filter(({ value }) => !value).map(({ key }) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config.app.approverUserIds.length === 0) {
    console.warn('Warning: No APPROVER_USER_IDS configured. No one will receive approval requests.');
  }
}

export { config, validateConfig };
export default config;
