const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStats, levelFromXp, xpForLevel, getLeaderboard } = require('../levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Show your or a member's level card")
    .addUserOption((o) => o.setName('member').setDescription('Member (defaults to you)'))
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member') ?? interaction.member;
    const { xp, messages } = getStats(interaction.guildId, member.id);
    const level = levelFromXp(xp);
    const currentFloor = xpForLevel(level);
    const nextAt = xpForLevel(level + 1);
    const progress = Math.min(100, Math.round(((xp - currentFloor) / (nextAt - currentFloor)) * 100));
    const position = getLeaderboard(interaction.guildId, 1000).findIndex((e) => e.userId === member.id) + 1;

    const filled = Math.round(progress / 10);
    const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${member.user.username}'s rank`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'XP', value: `${xp}`, inline: true },
        { name: 'Rank', value: position > 0 ? `#${position}` : '—', inline: true }
      )
      .setDescription(`Progress to level ${level + 1}: \`${bar}\` ${progress}%\nMessages: **${messages}**`)
      .setThumbnail(member.user.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
  },
};
