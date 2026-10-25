const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../store');

const EMOJI = { pending: '⏳', paid: '💰', delivered: '✅', cancelled: '❌' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-status')
    .setDescription('Update an order status')
    .addIntegerOption((o) => o.setName('id').setDescription('Order ID').setRequired(true))
    .addStringOption((o) =>
      o.setName('status').setDescription('New status').setRequired(true)
        .addChoices(
          { name: 'pending', value: 'pending' },
          { name: 'paid', value: 'paid' },
          { name: 'delivered', value: 'delivered' },
          { name: 'cancelled', value: 'cancelled' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const status = interaction.options.getString('status');

    const data = load('orders');
    const order = data[interaction.guildId]?.list.find((o) => o.id === id);
    if (!order) return interaction.reply({ content: `No order with ID **#${id}**.`, ephemeral: true });

    order.status = status;
    save('orders', data);
    await interaction.reply(
      `📋 Order **#${id}** (${order.item}) is now ${EMOJI[status]} **${status}** — buyer: <@${order.buyerId}>`
    );
  },
};
