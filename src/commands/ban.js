const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const access = require('../mod-access');
const modlog = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member to ban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the ban')
    )
    .setDMPermission(false),
  async execute(interaction) {
    const denied = access.guard(interaction, PermissionFlagsBits.BanMembers);
    if (denied) return interaction.reply({ content: denied, ephemeral: true });

    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!access.canActOn(interaction, member)) return interaction.reply({ content: access.HIERARCHY, ephemeral: true });
    if (!member.bannable)
      return interaction.reply({ content: 'I cannot ban that member (role hierarchy or missing permissions).', ephemeral: true });

    await member.ban({ reason: `${reason} — by ${interaction.user.tag}` });
    await modlog.deliver(interaction, { content: `${member} banned | Reason: ${reason}`, embed: modlog.banned({
          target: member.user,
          moderator: interaction.user,
          reason,
        }), allowedMentions: { parse: [] } });
  },
};
