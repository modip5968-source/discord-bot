const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product-remove')
    .setDescription('Remove a product from the catalog')
    .addIntegerOption((o) => o.setName('id').setDescription('Product ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const data = load('products');
    const shop = data[interaction.guildId];
    const idx = shop?.items.findIndex((p) => p.id === id) ?? -1;
    if (idx === -1) return interaction.reply({ content: `No product with ID **#${id}**.`, ephemeral: true });

    const [removed] = shop.items.splice(idx, 1);
    save('products', data);
    await interaction.reply(`🗑️ Removed **#${id} ${removed.name}** from the catalog.`);
  },
};
