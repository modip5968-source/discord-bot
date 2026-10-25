const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const warnCommand = require('./warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View a member's warnings")
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member to look up').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const warnings = warnCommand.loadWarnings()[`${interaction.guildId}:${user.id}`] ?? [];

    if (warnings.length === 0) {
      return interaction.reply({ content: `**${user.tag}** has no warnings. 🎉`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.tag} (${warnings.length})`)
      .setColor(0xfaa61a)
      .setDescription(
        warnings
          .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.by} (<t:${Math.floor(new Date(w.at).getTime() / 1000)}:R>)`)
          .join('\n')
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
