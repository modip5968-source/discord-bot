const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-new')
    .setDescription('Create a new order')
    .addUserOption((o) => o.setName('buyer').setDescription('The buyer').setRequired(true))
    .addStringOption((o) => o.setName('item').setDescription('What was sold').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const buyer = interaction.options.getUser('buyer');
    const item = interaction.options.getString('item');

    const data = load('orders');
    const shop = data[interaction.guildId] ?? (data[interaction.guildId] = { nextId: 1000, list: [] });
    const id = shop.nextId++;
    shop.list.push({
      id,
      buyerId: buyer.id,
      item,
      status: 'pending',
      sellerId: interaction.user.id,
      createdAt: new Date().toISOString(),
    });
    save('orders', data);

    await interaction.reply(
      `📋 Order **#${id}** created for ${buyer} — **${item}**\nStatus: ⏳ pending`
    );
  },
};
