const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product-list')
    .setDescription('Show the shop catalog')
    .setDMPermission(false),
  async execute(interaction) {
    const shop = load('products')[interaction.guildId];
    const items = shop?.items ?? [];
    if (items.length === 0) {
      return interaction.reply('🛒 The catalog is empty. Staff can add products with `/product-add`.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Shop Catalog')
      .setColor(0x5865f2)
      .setDescription(
        items
          .map((p) => {
            const stock = p.stock === 0 ? ' (SOLD OUT)' : p.stock < 0 ? ' (in stock)' : ` (${p.stock} left)`;
            return `**#${p.id} ${p.name}** — ${p.price}${stock}`;
          })
          .join('\n')
      );

    const withImage = items.find((p) => p.image);
    if (withImage) embed.setThumbnail(withImage.image);
    await interaction.reply({ embeds: [embed] });
  },
};
