import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import config from '../config/index.js';

const execAsync = promisify(exec);

/**
 * Chainguard client using chainctl CLI
 * This is an alternative to the API client that uses the chainctl command
 */
class ChainguardChainctlClient {
  constructor() {
    this.orgId = config.chainguard.orgId;
    this.registry = config.chainguard.registry;
  }

  /**
   * Create a custom assembly using chainctl
   * @param {Object} imageRequest - The image request details
   */
  async createCustomAssembly(imageRequest) {
    try {
      console.log('Creating custom assembly with chainctl:', imageRequest);

      // Create a sanitized custom image name from the request name
      // Remove special chars, convert to lowercase, replace spaces with hyphens
      const customImageName = imageRequest.requestName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50); // Limit length

      // Create a build configuration YAML
      const buildConfig = this.createBuildYaml(imageRequest);

      // Write to temp file
      const tempFile = join(tmpdir(), `chainguard-build-${Date.now()}.yaml`);
      await writeFile(tempFile, buildConfig);

      console.log('Created build config:', buildConfig);
      console.log('Custom image name:', customImageName);

      try {
        // Create a fake editor script that just copies our config file
        const editorScript = join(tmpdir(), `editor-${Date.now()}.sh`);
        await writeFile(editorScript, `#!/bin/bash\ncp ${tempFile} "$1"\n`, { mode: 0o755 });

        // Use chainctl image repo build edit with --save-as to create a new custom image
        // This uses EDITOR env var to provide the config non-interactively
        const command = `chainctl images repos build edit --parent ${this.orgId} --repo ${imageRequest.name} --save-as ${customImageName}`;

        console.log('Executing command:', command);
        console.log('Using custom editor:', editorScript);

        // Use 'yes' command to auto-confirm the prompt
        const { stdout, stderr } = await execAsync(`yes | ${command}`, {
          env: {
            ...process.env,
            CHAINCTL_TOKEN: config.chainguard.apiToken,
            EDITOR: editorScript
          }
        });

        console.log('chainctl stdout:', stdout);
        if (stderr) console.log('chainctl stderr:', stderr);

        // Clean up temp files
        await unlink(tempFile);
        await unlink(editorScript);

        // The custom image URL
        const imageUrl = `${this.registry}/${customImageName}:latest`;

        return {
          success: true,
          data: {
            id: `custom-${Date.now()}`,
            image_url: imageUrl,
            custom_name: customImageName,
            stdout,
            stderr
          }
        };
      } catch (error) {
        // Clean up temp files on error
        try {
          await unlink(tempFile);
        } catch {}
        try {
          const editorScript = join(tmpdir(), `editor-${Date.now()}.sh`);
          await unlink(editorScript);
        } catch {}

        throw error;
      }
    } catch (error) {
      console.error('Error creating custom assembly with chainctl:', error.message);
      return {
        success: false,
        error: error.message,
        details: error.stderr || 'Failed to execute chainctl. Ensure chainctl is installed and configured.'
      };
    }
  }

  /**
   * Create a build YAML configuration
   */
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

  /**
   * Check if chainctl is installed
   */
  async checkChainctl() {
    try {
      const { stdout } = await execAsync('chainctl version');
      return { installed: true, version: stdout.trim() };
    } catch (error) {
      return { installed: false, error: error.message };
    }
  }

  /**
   * List repos in the organization
   */
  async listRepos() {
    try {
      const { stdout } = await execAsync(`chainctl images repos list --parent ${this.orgId} -o json`);
      return {
        success: true,
        data: JSON.parse(stdout)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get build configuration for a repo
   */
  async getBuildConfig(repoName) {
    try {
      // Use a temporary editor that just outputs the config
      const tempScript = join(tmpdir(), `view-config-${Date.now()}.sh`);
      await writeFile(tempScript, '#!/bin/bash\ncat "$1"\nexit 1\n', { mode: 0o755 });

      try {
        await execAsync(`chainctl images repos build edit --parent ${this.orgId} --repo ${repoName}`, {
          env: {
            ...process.env,
            EDITOR: tempScript,
            CHAINCTL_TOKEN: config.chainguard.apiToken
          }
        });
      } catch (error) {
        // The script exits with 1, so we expect an error
        // The config will be in stderr
        const configContent = error.stderr || error.stdout || '';

        // Parse YAML to extract packages
        const packagesMatch = configContent.match(/packages:\s*([\s\S]*?)(?:\n\S|$)/);
        if (packagesMatch) {
          const packagesText = packagesMatch[1];
          const packages = packagesText
            .split('\n')
            .map(line => line.trim().replace(/^-\s*/, ''))
            .filter(p => p && !p.startsWith('#'));

          await unlink(tempScript);

          return {
            success: true,
            packages: packages
          };
        }
      }

      await unlink(tempScript);

      return {
        success: true,
        packages: []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        packages: []
      };
    }
  }

  /**
   * Find existing custom images with matching packages
   */
  async findMatchingCustomImages(baseRepo, requestedPackages) {
    try {
      const reposResult = await this.listRepos();
      if (!reposResult.success || !reposResult.data) {
        return { success: false, matches: [] };
      }

      const repos = reposResult.data.items || [];
      const matches = [];

      // Check custom repos (ones that are based on the base repo)
      for (const repo of repos) {
        // Skip the base repo itself
        if (repo.name === baseRepo) continue;

        // Get build config for this repo
        const configResult = await this.getBuildConfig(repo.name);
        if (configResult.success && configResult.packages) {
          // Check if this repo has all the requested packages
          const hasAllPackages = requestedPackages.every(pkg =>
            configResult.packages.includes(pkg)
          );

          if (hasAllPackages) {
            matches.push({
              repoName: repo.name,
              packages: configResult.packages,
              exactMatch: configResult.packages.length === requestedPackages.length
            });
          }
        }
      }

      return {
        success: true,
        matches: matches
      };
    } catch (error) {
      console.error('Error finding matching custom images:', error);
      return {
        success: false,
        matches: []
      };
    }
  }

  /**
   * List available images
   */
  async listImages() {
    try {
      const { stdout } = await execAsync(`chainctl images list --parent ${this.orgId} -o json`);
      return {
        success: true,
        data: JSON.parse(stdout)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List builds for a repo
   */
  async listBuilds(repoName) {
    try {
      const { stdout } = await execAsync(`chainctl images repos build list --parent ${this.orgId} --repo ${repoName} -o json`);
      return {
        success: true,
        data: JSON.parse(stdout)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get build logs
   */
  async getBuildLogs(repoName) {
    try {
      const { stdout } = await execAsync(`chainctl images repos build logs --parent ${this.orgId} --repo ${repoName}`);
      return {
        success: true,
        data: stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new ChainguardChainctlClient();
