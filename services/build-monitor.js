import chainguardClient from './chainguard-chainctl.js';
import datastore from './datastore.js';

/**
 * Build Monitor Service
 * Polls Chainguard for new builds and notifies users when custom images are ready
 */
class BuildMonitor {
  constructor() {
    this.pollingIntervals = new Map(); // requestId -> intervalId
    this.lastCheckedBuilds = new Map(); // repoName -> build timestamp
  }

  /**
   * Start monitoring a request for build completion
   * @param {string} requestId - The request ID to monitor
   * @param {string} repoName - The repo name to check for builds
   * @param {Function} onBuildComplete - Callback when build completes
   */
  startMonitoring(requestId, repoName, onBuildComplete) {
    console.log(`Starting build monitoring for request ${requestId}, repo: ${repoName}`);

    // Record when monitoring started (to only check for new builds)
    const monitoringStartTime = new Date();
    this.lastCheckedBuilds.set(repoName, monitoringStartTime);

    // Poll every 5 minutes
    const intervalId = setInterval(async () => {
      try {
        await this.checkForNewBuilds(requestId, repoName, monitoringStartTime, onBuildComplete);
      } catch (error) {
        console.error(`Error checking builds for ${requestId}:`, error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.pollingIntervals.set(requestId, intervalId);

    // Also check once immediately after 2 minutes
    setTimeout(async () => {
      try {
        await this.checkForNewBuilds(requestId, repoName, monitoringStartTime, onBuildComplete);
      } catch (error) {
        console.error(`Error in initial build check for ${requestId}:`, error);
      }
    }, 2 * 60 * 1000);

    // Stop monitoring after 24 hours
    setTimeout(() => {
      this.stopMonitoring(requestId);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Check for new builds
   */
  async checkForNewBuilds(requestId, repoName, monitoringStartTime, onBuildComplete) {
    const request = datastore.getRequest(requestId);
    if (!request || request.status === 'build_complete') {
      this.stopMonitoring(requestId);
      return;
    }

    console.log(`Checking for new builds for ${repoName}...`);

    const result = await chainguardClient.listBuilds(repoName);
    if (!result.success || !result.data || !result.data.reports) {
      console.log(`No builds found or error: ${result.error}`);
      return;
    }

    // Check if there's a successful build after we started monitoring
    const newBuilds = result.data.reports.filter(build => {
      if (!build.completionTime) return false;

      const buildTime = new Date(build.completionTime);
      return buildTime > monitoringStartTime && build.result === 'Success';
    });

    if (newBuilds.length > 0) {
      console.log(`Found ${newBuilds.length} new successful builds for ${repoName}`);

      // Get the most recent successful build
      const latestBuild = newBuilds[0];

      // Update request status
      datastore.updateRequest(requestId, {
        status: 'build_complete',
        buildCompletedAt: latestBuild.completionTime
      });

      // Notify user
      await onBuildComplete(request, latestBuild);

      // Stop monitoring this request
      this.stopMonitoring(requestId);
    } else {
      console.log(`No new builds yet for ${repoName}`);
    }
  }

  /**
   * Stop monitoring a request
   */
  stopMonitoring(requestId) {
    const intervalId = this.pollingIntervals.get(requestId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(requestId);
      console.log(`Stopped monitoring request ${requestId}`);
    }
  }

  /**
   * Stop all monitoring
   */
  stopAll() {
    for (const [requestId, intervalId] of this.pollingIntervals.entries()) {
      clearInterval(intervalId);
      console.log(`Stopped monitoring request ${requestId}`);
    }
    this.pollingIntervals.clear();
    this.lastCheckedBuilds.clear();
  }
}

export default new BuildMonitor();
