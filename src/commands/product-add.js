const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('product-add')
    .setDescription('Add a product to the shop catalog')
    .addStringOption((o) => o.setName('name').setDescription('Product name').setRequired(true))
    .addStringOption((o) => o.setName('price').setDescription('Price, e.g. 499 or $9.99').setRequired(true))
    .addIntegerOption((o) => o.setName('stock').setDescription('Stock count (-1 = unlimited)'))
    .addStringOption((o) => o.setName('description').setDescription('Short description'))
    .addStringOption((o) => o.setName('image').setDescription('Image URL'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const name = interaction.options.getString('name');
    const price = interaction.options.getString('price');
    const stock = interaction.options.getInteger('stock') ?? -1;
    const description = interaction.options.getString('description');
    const image = interaction.options.getString('image');

    if (image && !/^https?:\/\//i.test(image)) {
      return interaction.reply({ content: 'The image must be a valid http(s) URL.', ephemeral: true });
    }

    const data = load('products');
    const shop = data[interaction.guildId] ?? (data[interaction.guildId] = { nextId: 1, items: [] });
    const id = shop.nextId++;
    shop.items.push({ id, name, price, stock, description: description ?? null, image: image ?? null });
    save('products', data);

    const embed = new EmbedBuilder()
      .setTitle(`🛒 #${id} — ${name}`)
      .setColor(0x57f287)
      .addFields(
        { name: 'Price', value: price, inline: true },
        { name: 'Stock', value: stock < 0 ? '∞ unlimited' : `${stock}`, inline: true }
      );
    if (description) embed.setDescription(description);
    if (image) embed.setImage(image);

    await interaction.reply({ content: '✅ Product added to the catalog:', embeds: [embed] });
  },
};
