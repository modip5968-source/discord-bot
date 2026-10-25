const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!member.kickable)
      return interaction.reply({ content: 'I cannot kick that member (role hierarchy or missing permissions).', ephemeral: true });

    await member.kick(`${reason} — by ${interaction.user.tag}`);
    await interaction.reply(`👢 **${member.user.tag}** was kicked. Reason: ${reason}`);
  },
};
