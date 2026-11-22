const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const access = require('../mod-access');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to unlock (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDMPermission(false),
  async execute(interaction) {
    const denied = access.guard(interaction, PermissionFlagsBits.ManageChannels);
    if (denied) return interaction.reply({ content: denied, ephemeral: true });

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
      });
    } catch {
      return interaction.reply({ content: 'I could not unlock that channel (missing permissions).', ephemeral: true });
    }

    await channel.send(`🔓 This channel has been unlocked by <@${interaction.user.id}>.`);
    await interaction.reply({ content: `🔓 ${channel} unlocked.`, ephemeral: true });
  },
};
