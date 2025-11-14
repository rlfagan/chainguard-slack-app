import { exec } from 'child_process';
import { promisify } from 'util';
import config from '../config/index.js';

const execAsync = promisify(exec);

/**
 * Package Search Service
 * Searches for available packages in Chainguard/Wolfi repositories
 */
class PackageSearch {
  constructor() {
    this.orgId = config.chainguard.orgId;
  }

  /**
   * Search for packages using apk
   * @param {string} searchTerm - Package name or keyword to search for
   */
  async searchPackages(searchTerm) {
    try {
      console.log(`[PackageSearch] Searching for: "${searchTerm}"`);

      // Use apk search to find packages
      // We'll search the Wolfi repository which Chainguard images use
      const command = `apk search -v ${searchTerm} --repository https://packages.wolfi.dev/os 2>/dev/null || echo "No packages found"`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000 // 10 second timeout
      });

      console.log(`[PackageSearch] apk search stdout: ${stdout.substring(0, 200)}`);
      if (stderr) {
        console.log(`[PackageSearch] apk search stderr: ${stderr}`);
      }

      if (stdout.includes('No packages found') || !stdout.trim()) {
        console.log(`[PackageSearch] No packages found via apk, using fallback`);
        return this.searchWithChainctl(searchTerm);
      }

      // Parse apk output (format: package-name-version description)
      const lines = stdout.trim().split('\n').filter(line => line.trim());
      const packages = lines.map(line => {
        const match = line.match(/^([a-z0-9\-_.]+)-(\d+[^\s]*)\s*(.*)$/);
        if (match) {
          return {
            name: match[1],
            version: match[2],
            description: match[3] || ''
          };
        }
        return null;
      }).filter(p => p !== null);

      console.log(`[PackageSearch] Found ${packages.length} packages via apk`);

      return {
        success: true,
        packages: packages.slice(0, 20), // Limit to 20 results
        searchTerm,
        total: packages.length
      };
    } catch (error) {
      console.error('[PackageSearch] Error searching packages with apk:', error.message);

      // Fallback to chainctl if apk fails
      return this.searchWithChainctl(searchTerm);
    }
  }

  /**
   * Fallback search using common package names
   */
  async searchWithChainctl(searchTerm) {
    console.log(`[PackageSearch] Using fallback search for: "${searchTerm}"`);

    // Common packages list for suggestions
    const commonPackages = [
      { name: 'curl', description: 'Command line tool for transferring data with URLs' },
      { name: 'wget', description: 'Network utility to retrieve files from the Web' },
      { name: 'git', description: 'Distributed version control system' },
      { name: 'bash', description: 'GNU Bourne Again shell' },
      { name: 'python-3.13', description: 'Python programming language (3.13)' },
      { name: 'python-3.14', description: 'Python programming language (3.14)' },
      { name: 'nodejs-22', description: 'Node.js JavaScript runtime (v22)' },
      { name: 'nodejs-25', description: 'Node.js JavaScript runtime (v25)' },
      { name: 'go', description: 'Go programming language' },
      { name: 'jq', description: 'Command-line JSON processor' },
      { name: 'vim', description: 'Vi IMproved text editor' },
      { name: 'nano', description: 'Simple text editor' },
      { name: 'openssh', description: 'OpenSSH client and server' },
      { name: 'openssl', description: 'Toolkit for SSL/TLS protocols' },
      { name: 'postgresql', description: 'PostgreSQL database' },
      { name: 'redis', description: 'In-memory data structure store' },
      { name: 'nginx', description: 'HTTP and reverse proxy server' },
      { name: 'gcc', description: 'GNU Compiler Collection' },
      { name: 'make', description: 'GNU Make build automation tool' },
      { name: 'cmake', description: 'Cross-platform build system' }
    ];

    const searchLower = searchTerm.toLowerCase();
    console.log(`[PackageSearch] Searching for "${searchLower}" in ${commonPackages.length} common packages`);

    const matches = commonPackages.filter(pkg =>
      pkg.name.includes(searchLower) || pkg.description.toLowerCase().includes(searchLower)
    );

    console.log(`[PackageSearch] Fallback found ${matches.length} matches`);
    if (matches.length > 0) {
      console.log(`[PackageSearch] First match: ${matches[0].name}`);
    }

    return {
      success: true,
      packages: matches.map(pkg => ({
        name: pkg.name,
        version: 'latest',
        description: pkg.description
      })),
      searchTerm,
      fallback: true
    };
  }

  /**
   * Get popular packages by category
   */
  getPopularPackages() {
    return {
      'Development Tools': [
        'git', 'vim', 'nano', 'curl', 'wget', 'jq', 'make', 'gcc', 'cmake'
      ],
      'Programming Languages': [
        'python-3.14', 'python-3.13', 'nodejs-25', 'nodejs-22', 'go', 'ruby', 'php'
      ],
      'Databases': [
        'postgresql', 'mysql', 'redis', 'mongodb'
      ],
      'Web Servers': [
        'nginx', 'apache', 'caddy'
      ],
      'Security': [
        'openssl', 'openssh', 'gnupg'
      ]
    };
  }
}

export default new PackageSearch();
