const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const warnings = require('../warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a member')
    .addUserOption((opt) => opt.setName('member').setDescription('The member to unwarn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why the warning is being removed').setRequired(true))
    .addBooleanOption((opt) => opt.setName('all').setDescription('Remove every warning from this member'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const all = interaction.options.getBoolean('all') ?? false;

    if (all) {
      const removed = warnings.clear(interaction.guildId, user.id);
      return interaction.reply(
        removed
          ? `✅ Cleared **${removed}** warning(s) from **${user.tag}**. Reason: ${reason}`
          : `**${user.tag}** has no warnings to clear.`
      );
    }

    const removed = warnings.removeLast(interaction.guildId, user.id);
    if (!removed) {
      return interaction.reply({ content: `**${user.tag}** has no warnings to remove.`, ephemeral: true });
    }

    const left = warnings.list(interaction.guildId, user.id).length;
    await interaction.reply(
      `✅ Removed one warning from **${user.tag}** (${left} left). Original: *${removed.reason}* — Reason for removal: ${reason}`
    );
  },
};
