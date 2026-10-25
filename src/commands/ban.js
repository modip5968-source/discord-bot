const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!member.bannable)
      return interaction.reply({ content: 'I cannot ban that member (role hierarchy or missing permissions).', ephemeral: true });

    await member.ban({ reason: `${reason} — by ${interaction.user.tag}` });
    await interaction.reply(`🔨 **${member.user.tag}** was banned. Reason: ${reason}`);
  },
};
