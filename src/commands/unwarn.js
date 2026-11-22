const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const warnings = require('../warnings');
const modlog = require('../modlog');

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
      const list = warnings.list(interaction.guildId, user.id);
      const removed = warnings.clear(interaction.guildId, user.id);
      if (!removed) return interaction.reply({ content: `**${user.tag}** has no warnings to clear.`, ephemeral: true });

      return interaction.reply({
        content: `Cleared ${removed} warning(s) from ${user} | Reason: ${reason}`,
        embeds: [
          modlog.warningRemoved({
            target: user,
            moderator: interaction.user,
            reason,
            originalModerator: list[list.length - 1]?.by ?? 'Unknown',
            left: 0,
          }),
        ],
        allowedMentions: { parse: [] },
      });
    }

    const removed = warnings.removeLast(interaction.guildId, user.id);
    if (!removed) {
      return interaction.reply({ content: `**${user.tag}** has no warnings to remove.`, ephemeral: true });
    }

    const left = warnings.list(interaction.guildId, user.id).length;
    await modlog.deliver(interaction, { content: `Warning removed from ${user} | Reason: ${reason}`, embed: modlog.warningRemoved({
          target: user,
          moderator: interaction.user,
          reason,
          originalModerator: removed.by ?? 'Unknown',
          left,
        }), allowedMentions: { parse: [] } });
  },
};
