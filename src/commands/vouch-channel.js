const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const autoVouch = require('../vouches');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch-channel')
    .setDescription('Choose where vouch embeds get posted')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Where vouches should go').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    autoVouch.setVouchChannelId(interaction.guildId, channel.id);

    const perms = channel.permissionsFor(interaction.guild.members.me);
    const missing = [];
    if (!perms.has(PermissionFlagsBits.SendMessages)) missing.push('Send Messages');
    if (!perms.has(PermissionFlagsBits.EmbedLinks)) missing.push('Embed Links');

    await interaction.reply({
      content: missing.length
        ? `⚠️ Saved ${channel} but I am missing **${missing.join('** and **')}** there.`
        : `✅ Vouches will now be posted in ${channel}.`,
      ephemeral: true,
    });
  },
};
