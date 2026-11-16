const { SlashCommandBuilder } = require('discord.js');
const { getTrade, getConfig, updateTrade, tradeEmbed, isMiddleman, finishTrade } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-cancel')
    .setDescription('Cancel this middleman trade and archive the transcript')
    .addStringOption((o) => o.setName('reason').setDescription('Why the trade is being cancelled').setRequired(true)),
  async execute(interaction) {
    const trade = getTrade(interaction.channelId);
    if (!trade) return interaction.reply({ content: 'This is not a middleman trade ticket.', ephemeral: true });
    if (['done', 'cancelled'].includes(trade.stage)) {
      return interaction.reply({ content: 'This trade is already closed.', ephemeral: true });
    }

    const cfg = getConfig(trade.guildId);
    const staff = isMiddleman(interaction.member, cfg);
    const trader = [trade.requesterId, trade.partnerId].includes(interaction.user.id);
    if (!staff && !trader) {
      return interaction.reply({ content: 'Only the two traders or a middleman can cancel this trade.', ephemeral: true });
    }
    if (trader && !staff && trade.stage !== 'terms' && trade.stage !== 'claim') {
      return interaction.reply({
        content: 'Items are already being collected, so only a middleman can cancel now.',
        ephemeral: true,
      });
    }

    const reason = interaction.options.getString('reason');
    const updated = updateTrade(interaction.channelId, { stage: 'cancelled' });
    await interaction.reply({
      content: `❌ Cancelled by ${interaction.user}. Reason: ${reason}`,
      embeds: [tradeEmbed(updated)],
    });
    await finishTrade(interaction.channel, `cancelled: ${reason}`);
  },
};
