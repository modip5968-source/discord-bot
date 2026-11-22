const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modlog = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a mute (timeout) from a member')
    .addUserOption((o) => o.setName('user').setDescription('The member to unmute').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: `${member} is not muted.`, ephemeral: true });
    }

    await member.timeout(null, `Unmuted: ${reason} — by ${interaction.user.tag}`);
    await interaction.reply({
      content: `Timeout removed from ${member} | Reason: ${reason}`,
      embeds: [
        modlog.timeoutRemoved({
          target: member.user,
          moderator: interaction.user,
          reason,
        }),
      ],
      allowedMentions: { parse: [] },
    });

    try {
      await member.send(`You were unmuted in **${interaction.guild.name}**. Reason: ${reason}`);
    } catch {}
  },
};
