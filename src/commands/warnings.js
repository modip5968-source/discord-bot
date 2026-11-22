const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const access = require('../mod-access');
const warningsStore = require('../warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View a member's warnings")
    .addUserOption((opt) => opt.setName('member').setDescription('The member to look up').setRequired(true))
    .setDMPermission(false),
  async execute(interaction) {
    const denied = access.guard(interaction, PermissionFlagsBits.ModerateMembers);
    if (denied) return interaction.reply({ content: denied, ephemeral: true });

    const user = interaction.options.getUser('member');
    const warnings = warningsStore.list(interaction.guildId, user.id);

    if (warnings.length === 0) {
      return interaction.reply({ content: `**${user.tag}** has no warnings. 🎉`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.username}`)
      .setColor(0xfaa61a)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        warnings.map((w, i) => ({
          name: `Warn #${i + 1}`,
          value: [
            `**Reason:** ${w.reason}`,
            `**Moderator:** ${w.by}`,
            `**Time:** <t:${Math.floor(new Date(w.at).getTime() / 1000)}:f>`,
          ].join('\n'),
        }))
      )
      .setFooter({ text: `Total warnings: ${warnings.length}` });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
