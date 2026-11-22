const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const access = require('../mod-access');
const modlog = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod-logs')
    .setDescription('Choose the channel where every moderation log is posted')
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Channel for moderation logs (leave empty to see the current setting)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    )
    .addBooleanOption((o) =>
      o.setName('off').setDescription('Turn moderation logging off')
    )
    .setDMPermission(false),

  async execute(interaction) {
    const denied = access.guard(interaction, PermissionFlagsBits.ManageGuild);
    if (denied) return interaction.reply({ content: denied, ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const off = interaction.options.getBoolean('off');
    const guild = interaction.guild;

    // Read current setting
    if (!channel && !off) {
      const id = modlog.getLogChannelId(guild.id);
      const current = id ? `<#${id}>` : null;
      const embed = new EmbedBuilder()
        .setColor(current ? 0x5865f2 : 0x95a5a6)
        .setTitle('Moderation logs')
        .setDescription(
          current
            ? `All moderation logs go to ${current}.\n\nUse \`/mod-logs channel:#channel\` to change it, or \`/mod-logs off:true\` to stop logging.`
            : 'No log channel set yet.\n\nUse `/mod-logs channel:#channel` to pick one.'
        )
        .addFields({
          name: 'What gets logged',
          value: [
            'Member Warned / Warning Removed',
            'User Timed Out / Timeout Removed',
            'User Banned / User Unbanned',
            'Member Kicked',
            'Messages Purged / Channel Nuked',
          ].join('\n'),
        });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (off) {
      modlog.setLogChannel(guild.id, null);
      return interaction.reply({ content: 'Moderation logging is off. Cards will post in the channel where you run the command again.', ephemeral: true });
    }

    if (!channel.isTextBased()) {
      return interaction.reply({ content: 'Pick a text channel.', ephemeral: true });
    }
    if (!channel.permissionsFor(guild.members.me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return interaction.reply({
        content: `I need **View Channel**, **Send Messages** and **Embed Links** in ${channel}.`,
        ephemeral: true,
      });
    }

    modlog.setLogChannel(guild.id, channel.id);
    return interaction.reply({
      content: `Moderation logs will now be posted in ${channel}.`,
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('Log channel set')
          .setDescription(`Every warn, unwarn, timeout, untimeout, ban, unban and kick will be recorded in ${channel}.`)
          .addFields({ name: 'Set by', value: `${interaction.user}`, inline: true }),
      ],
    });
  },
};
