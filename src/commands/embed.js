const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Send a custom embed')
    .addStringOption((opt) =>
      opt.setName('title').setDescription('Embed title').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('description').setDescription('Embed text').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('color').setDescription('Hex color, e.g. #ff0000 (defaults to blurple)')
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to send it in (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const colorInput = interaction.options.getString('color');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    let color = 0x5865f2;
    if (colorInput) {
      const parsed = parseInt(colorInput.replace('#', ''), 16);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 0xffffff) {
        return interaction.reply({ content: 'Invalid color. Use a hex value like `#ff0000`.', ephemeral: true });
      }
      color = parsed;
    }

    if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
      return interaction.reply({ content: 'I cannot send messages in that channel.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: `By ${interaction.user.tag}` });

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Embed sent in ${channel}.`, ephemeral: true });
  },
};
