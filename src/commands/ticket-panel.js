const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post a ticket panel with an open-ticket button')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to post the panel in (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((opt) =>
      opt.setName('image').setDescription('Image URL shown on the panel')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const image = interaction.options.getString('image');

    const embed = new EmbedBuilder()
      .setTitle('🎫 Support Tickets')
      .setDescription(
        'Need help? Click the button below to open a private ticket with staff.'
      )
      .setColor(0x5865f2);

    if (image) embed.setImage(image);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('🎫 Open a Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `Ticket panel posted in ${channel}.`, ephemeral: true });
  },
};
