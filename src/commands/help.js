const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const CATEGORIES = {
  '🛡️ Moderation': ['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'unwarn', 'warnings', 'lock', 'unlock'],
  '🛒 Shop': ['product-add', 'product-list', 'product-remove', 'product-stock', 'vouch', 'vouches', 'order-new', 'order-status', 'order-list'],
  '💰 Wallet & Levels': ['balance', 'pay', 'wallet-give', 'wallet-take', 'rank', 'leaderboard'],
  '🎉 Giveaways': ['giveaway'],
  '👋 Members': ['welcome', 'goodbye', 'boost', 'invites', 'autorole'],
  '🎭 Roles': ['promo', 'demo'],
  '🎫 Tickets': ['ticket-panel', 'ticket-panel-edit', 'ticket-open', 'add', 'transfer', 'ticket-close'],
  '🤝 Middleman': ['mm-setup', 'middleman'],
  '🧰 Utility': ['help', 'xd', 'avatar', 'serverinfo', 'say', 'announce', 'embed', 'afk'],
  '🎲 Fun': ['eightball', 'roll', 'poll', 'lol'],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands'),
  async execute(interaction) {
    const commands = interaction.client.commands;
    const embed = new EmbedBuilder()
      .setTitle('🤖 Commands')
      .setColor(0x5865f2)
      .setDescription(
        `Every command works as a slash command or with the \`$\` prefix (e.g. \`$product-list\`).`
      );

    for (const [category, names] of Object.entries(CATEGORIES)) {
      const lines = names
        .filter((n) => commands.has(n))
        .map((n) => `\`/${n}\` — ${commands.get(n).data.description}`);
      if (lines.length) embed.addFields({ name: category, value: lines.join('\n') });
    }

    // anything not categorized
    const categorized = new Set(Object.values(CATEGORIES).flat());
    const rest = [...commands.values()].filter((c) => !categorized.has(c.data.name));
    if (rest.length) {
      embed.addFields({
        name: 'Other',
        value: rest.map((c) => `\`/${c.data.name}\` — ${c.data.description}`).join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
