const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard, levelFromXp } = require('../levels');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top 10 most active members')
    .setDMPermission(false),
  async execute(interaction) {
    const top = getLeaderboard(interaction.guildId, 10);
    if (top.length === 0) return interaction.reply('📊 Nobody has XP yet — start chatting!');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Leaderboard')
      .setColor(0xfee75c)
      .setDescription(
        top
          .map((e, i) => `${MEDALS[i] ?? `**${i + 1}.**`} <@${e.userId}> — Level **${levelFromXp(e.xp)}** (${e.xp} XP)`)
          .join('\n')
      );
    await interaction.reply({ embeds: [embed] });
  },
};
