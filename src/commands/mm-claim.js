const { SlashCommandBuilder } = require('discord.js');
const { getTrade, getConfig, updateTrade, tradeEmbed, isMiddleman } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-claim')
    .setDescription('Claim the middleman trade ticket you are in'),
  async execute(interaction) {
    const trade = getTrade(interaction.channelId);
    if (!trade) return interaction.reply({ content: 'This is not a middleman trade ticket.', ephemeral: true });

    const cfg = getConfig(trade.guildId);
    if (!isMiddleman(interaction.member, cfg)) {
      return interaction.reply({ content: 'Only members with the middleman role can claim trades.', ephemeral: true });
    }
    if (interaction.user.id === trade.requesterId || interaction.user.id === trade.partnerId) {
      return interaction.reply({ content: "You can't middleman your own trade.", ephemeral: true });
    }
    if (trade.stage !== 'claim') {
      return interaction.reply({
        content:
          trade.mmId && trade.mmId !== interaction.user.id
            ? `This trade is already handled by <@${trade.mmId}>.`
            : `This trade is in stage **${trade.stage}** - it is not waiting for a middleman.`,
        ephemeral: true,
      });
    }

    const updated = updateTrade(interaction.channelId, { mmId: interaction.user.id, stage: 'escrow' });
    await interaction.reply({ content: `🛡️ ${interaction.user} claimed this trade.`, embeds: [tradeEmbed(updated)] });
    await interaction.channel
      .send(`Traders: send your items **only to ${interaction.user}**. Wait until they confirm everything is collected.`)
      .catch(() => {});
  },
};
