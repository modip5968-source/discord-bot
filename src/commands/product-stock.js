const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product-stock')
    .setDescription('Update a product stock (-1 = unlimited, 0 = sold out)')
    .addIntegerOption((o) => o.setName('id').setDescription('Product ID').setRequired(true))
    .addIntegerOption((o) => o.setName('stock').setDescription('New stock count').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const stock = interaction.options.getInteger('stock');
    if (stock < -1) return interaction.reply({ content: 'Stock must be 0 or higher (or -1 for unlimited).', ephemeral: true });

    const data = load('products');
    const product = data[interaction.guildId]?.items.find((p) => p.id === id);
    if (!product) return interaction.reply({ content: `No product with ID **#${id}**.`, ephemeral: true });

    product.stock = stock;
    save('products', data);
    await interaction.reply(`📦 **#${id} ${product.name}** stock is now ${stock < 0 ? '∞ unlimited' : stock}.`);
  },
};
