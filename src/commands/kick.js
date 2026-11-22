const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const access = require('../mod-access');
const modlog = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member to kick').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the kick')
    )
    .setDMPermission(false),
  async execute(interaction) {
    const denied = access.guard(interaction, PermissionFlagsBits.KickMembers);
    if (denied) return interaction.reply({ content: denied, ephemeral: true });

    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!access.canActOn(interaction, member)) return interaction.reply({ content: access.HIERARCHY, ephemeral: true });
    if (!member.kickable)
      return interaction.reply({ content: 'I cannot kick that member (role hierarchy or missing permissions).', ephemeral: true });

    await member.kick(`${reason} — by ${interaction.user.tag}`);
    await modlog.deliver(interaction, { content: `${member} kicked | Reason: ${reason}`, embed: modlog.kicked({
          target: member.user,
          moderator: interaction.user,
          reason,
        }), allowedMentions: { parse: [] } });
  },
};
