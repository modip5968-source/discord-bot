const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const warnings = require('../warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption((opt) => opt.setName('member').setDescription('The member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const all = warnings.add(interaction.guildId, user.id, {
      reason,
      by: interaction.user.tag,
      at: new Date().toISOString(),
    });

    await interaction.reply(`⚠️ **${user.tag}** warned (${all.length} total). Reason: ${reason}`);

    try {
      await user.send(`You were warned in **${interaction.guild.name}**: ${reason}`);
    } catch {
      // DMs closed, ignore
    }
  },
};
