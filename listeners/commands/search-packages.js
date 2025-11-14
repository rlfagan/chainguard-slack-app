import packageSearch from '../../services/package-search.js';

export default function registerSearchPackagesCommand(app) {
  app.command('/search-packages', async ({ command, ack, client }) => {
    await ack();

    const searchTerm = command.text.trim();

    if (!searchTerm) {
      // Show popular packages if no search term
      const popularPackages = packageSearch.getPopularPackages();

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: ':mag: *Popular Packages by Category*\n\nUse `/search-packages <keyword>` to search for specific packages.'
          }
        },
        { type: 'divider' }
      ];

      for (const [category, packages] of Object.entries(popularPackages)) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${category}*\n${packages.map(p => `\`${p}\``).join(', ')}`
          }
        });
      }

      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'Popular packages by category',
        blocks
      });

      return;
    }

    // Show searching message
    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: `:hourglass_flowing_sand: Searching for packages matching "${searchTerm}"...`
    });

    // Search for packages
    const result = await packageSearch.searchPackages(searchTerm);

    if (!result.success || result.packages.length === 0) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `:x: No packages found matching "${searchTerm}". Try a different search term or use \`/search-packages\` without arguments to see popular packages.`
      });
      return;
    }

    // Build results message
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:mag: *Package Search Results for "${searchTerm}"*\n\nFound ${result.packages.length} package${result.packages.length > 1 ? 's' : ''}${result.total > result.packages.length ? ` (showing first ${result.packages.length} of ${result.total})` : ''}`
        }
      },
      { type: 'divider' }
    ];

    // Add each package as a separate section
    result.packages.forEach(pkg => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*\`${pkg.name}\`*${pkg.version ? ` - v${pkg.version}` : ''}\n${pkg.description || '_No description available_'}`
        }
      });
    });

    if (result.fallback) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: ':information_source: _Showing common packages. For a full package search, you can browse https://packages.wolfi.dev_'
          }
        ]
      });
    }

    await client.chat.postEphemeral({
      channel: command.channel_id,
      user: command.user_id,
      text: `Found ${result.packages.length} packages`,
      blocks
    });
  });
}
