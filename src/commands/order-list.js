const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../store');

const EMOJI = { pending: '⏳', paid: '💰', delivered: '✅', cancelled: '❌' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-list')
    .setDescription('Show the 10 most recent orders')
    .setDMPermission(false),
  async execute(interaction) {
    const shop = load('orders')[interaction.guildId];
    const orders = (shop?.list ?? []).slice(-10).reverse();
    if (orders.length === 0) {
      return interaction.reply('📋 No orders yet. Create one with `/order-new`.');
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Recent Orders')
      .setColor(0x5865f2)
      .setDescription(
        orders
          .map((o) => `**#${o.id}** ${EMOJI[o.status] ?? '⏳'} ${o.status} — ${o.item} — buyer: <@${o.buyerId}>`)
          .join('\n')
      );
    await interaction.reply({ embeds: [embed] });
  },
};
