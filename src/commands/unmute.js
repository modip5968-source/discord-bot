const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const access = require('../mod-access');
const modlog = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a mute (timeout) from a member')
    .addUserOption((o) => o.setName('user').setDescription('The member to unmute').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the unmute').setRequired(true))
    .setDMPermission(false),
  async execute(interaction) {
    const denied = access.guard(interaction, PermissionFlagsBits.ModerateMembers);
    if (denied) return interaction.reply({ content: denied, ephemeral: true });

    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!access.canActOn(interaction, member)) return interaction.reply({ content: access.HIERARCHY, ephemeral: true });
    if (!member.isCommunicationDisabled()) {
      return interaction.reply({ content: `${member} is not muted.`, ephemeral: true });
    }

    await member.timeout(null, `Unmuted: ${reason} — by ${interaction.user.tag}`);
    await modlog.deliver(interaction, { content: `Timeout removed from ${member} | Reason: ${reason}`, embed: modlog.timeoutRemoved({
          target: member.user,
          moderator: interaction.user,
          reason,
        }), allowedMentions: { parse: [] } });

    try {
      await member.send(`You were unmuted in **${interaction.guild.name}**. Reason: ${reason}`);
    } catch {}
  },
};
