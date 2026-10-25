const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { parseMessageRef } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel-edit')
    .setDescription('Edit a ticket panel: title, description, image or button label')
    .addStringOption((opt) =>
      opt
        .setName('panel')
        .setDescription('The panel message link or message ID')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('title').setDescription('New panel title')
    )
    .addStringOption((opt) =>
      opt.setName('description').setDescription('New panel description')
    )
    .addStringOption((opt) =>
      opt.setName('image').setDescription('New panel image URL')
    )
    .addBooleanOption((opt) =>
      opt.setName('remove_image').setDescription('Remove the panel image')
    )
    .addStringOption((opt) =>
      opt
        .setName('button')
        .setDescription('New label for the open-ticket button (max 80 characters)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    const ref = interaction.options.getString('panel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const image = interaction.options.getString('image');
    const removeImage = interaction.options.getBoolean('remove_image');
    const button = interaction.options.getString('button');

    if (!title && !description && !image && !removeImage && !button) {
      return interaction.reply({
        content: 'Give me at least one thing to change: `title`, `description`, `image`, `remove_image` or `button`.',
        ephemeral: true,
      });
    }

    if (button && button.length > 80) {
      return interaction.reply({ content: 'The button label must be 80 characters or fewer.', ephemeral: true });
    }
    if (image && !/^https?:\/\//i.test(image)) {
      return interaction.reply({ content: 'The image must be a valid http(s) URL.', ephemeral: true });
    }

    const parsed = parseMessageRef(ref, interaction.channelId);
    if (!parsed) {
      return interaction.reply({
        content: 'I could not read that. Give me the panel message link, or just its message ID if it is in this channel.',
        ephemeral: true,
      });
    }

    let message;
    try {
      const channel = await interaction.guild.channels.fetch(parsed.channelId);
      message = await channel.messages.fetch(parsed.messageId);
    } catch {
      return interaction.reply({ content: 'I could not find that message. Check the link or message ID.', ephemeral: true });
    }

    // Must be one of our panel messages
    const row = message.components[0];
    const openButton =
      row && row.components && row.components.find((b) => b.customId === 'ticket_open');
    if (message.author.id !== interaction.client.user.id || message.embeds.length === 0 || !openButton) {
      return interaction.reply({ content: 'That message is not a ticket panel. Only panels created with `/ticket-panel` can be edited.', ephemeral: true });
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    if (title) embed.setTitle(`🎫 ${title.replace(/^🎫\s*/, '')}`);
    if (description) embed.setDescription(description);
    if (image) embed.setImage(image);
    if (removeImage) embed.setImage(null);

    const newRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel(button ?? openButton.label)
        .setStyle(ButtonStyle.Primary)
    );

    await message.edit({ embeds: [embed], components: [newRow] });
    await interaction.reply({ content: '✅ Ticket panel updated.', ephemeral: true });
  },
};
