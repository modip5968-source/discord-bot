const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to a channel')
    .addStringOption((opt) =>
      opt.setName('title').setDescription('Announcement title').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('message').setDescription('Announcement text').setRequired(true)
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to announce in (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    if (!channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
      return interaction.reply({ content: 'I cannot send messages in that channel.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor(0x5865f2)
      .setFooter({ text: `Announcement by ${interaction.user.tag}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `Announcement sent in ${channel}.`, ephemeral: true });
  },
};
