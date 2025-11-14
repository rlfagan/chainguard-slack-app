import registerRequestImageShortcut from './shortcuts/request-image.js';
import registerRequestImageCommand from './commands/request-image.js';
import registerListRequestsCommand from './commands/list-requests.js';
import registerSearchPackagesCommand from './commands/search-packages.js';
import registerApprovalActions from './events/approval-actions.js';

export function registerListeners(app) {
  // Register shortcuts
  registerRequestImageShortcut(app);

  // Register commands
  registerRequestImageCommand(app);
  registerListRequestsCommand(app);
  registerSearchPackagesCommand(app);

  // Register action handlers
  registerApprovalActions(app);

  console.log('✅ All listeners registered');
}
