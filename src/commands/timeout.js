const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member to timeout').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('minutes')
        .setDescription('Timeout length in minutes (max 40320)')
        .setRequired(true)
        .setMaxValue(40320)
        .setMinValue(1)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the timeout')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');
    const minutes = interaction.options.getInteger('minutes');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (!member.moderatable)
      return interaction.reply({ content: 'I cannot timeout that member.', ephemeral: true });

    await member.timeout(minutes * 60_000, `${reason} — by ${interaction.user.tag}`);
    await interaction.reply(`🔇 **${member.user.tag}** was timed out for **${minutes} minutes**. Reason: ${reason}`);
  },
};
