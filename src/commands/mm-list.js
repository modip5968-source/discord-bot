const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { data, STAGE_LABEL } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-list')
    .setDescription('Show every open middleman trade in this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const trades = Object.entries(data().trades).filter(
      ([, t]) => t.guildId === interaction.guildId && !['done', 'cancelled'].includes(t.stage)
    );

    if (!trades.length) {
      return interaction.reply({ content: 'No open middleman trades right now. 🎉', ephemeral: true });
    }

    const lines = trades
      .sort((a, b) => String(a[1].createdAt).localeCompare(String(b[1].createdAt)))
      .slice(0, 20)
      .map(([channelId, t]) => {
        const age = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
        const mm = t.mmId ? `<@${t.mmId}>` : '**unclaimed**';
        return `<#${channelId}> · ${STAGE_LABEL[t.stage] ?? t.stage}\n　<@${t.requesterId}> ⇄ <@${t.partnerId}> · MM: ${mm} · ${age}m old`;
      });

    const embed = new EmbedBuilder()
      .setTitle(`Open middleman trades (${trades.length})`)
      .setColor(0x5865f2)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: trades.length > 20 ? 'Showing the 20 oldest' : 'All open trades' });

    await interaction.reply({ embeds: [embed] });
  },
};
