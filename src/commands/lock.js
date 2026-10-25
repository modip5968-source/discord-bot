const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so members cannot send messages')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to lock (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for locking')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });
    } catch {
      return interaction.reply({ content: 'I could not lock that channel (missing permissions).', ephemeral: true });
    }

    await channel.send(
      `🔒 This channel has been locked by <@${interaction.user.id}>. Reason: ${reason}`
    );
    await interaction.reply({ content: `🔒 ${channel} locked. Reason: ${reason}`, ephemeral: true });
  },
};
