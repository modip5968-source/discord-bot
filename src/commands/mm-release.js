const { SlashCommandBuilder } = require('discord.js');
const { getTrade, updateTrade, tradeEmbed } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-release')
    .setDescription('Mark the items as collected and released in this trade ticket'),
  async execute(interaction) {
    const trade = getTrade(interaction.channelId);
    if (!trade) return interaction.reply({ content: 'This is not a middleman trade ticket.', ephemeral: true });
    if (trade.mmId !== interaction.user.id) {
      return interaction.reply({ content: 'Only the middleman who claimed this trade can release it.', ephemeral: true });
    }
    if (trade.stage !== 'escrow') {
      return interaction.reply({ content: `This trade is in stage **${trade.stage}**, so there is nothing to release.`, ephemeral: true });
    }

    const updated = updateTrade(interaction.channelId, { stage: 'release' });
    await interaction.reply({ content: '📦 Items released.', embeds: [tradeEmbed(updated)] });
    await interaction.channel
      .send(
        `<@${trade.requesterId}> and <@${trade.partnerId}> - check your items and press **I Received My Items** once you have yours.`
      )
      .catch(() => {});
  },
};
