const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCount, getLeaderboard, getInvitedMembers, getInviterOf } = require('../invites');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Show invite stats: your own, a member\'s, or the leaderboard')
    .addUserOption((o) => o.setName('member').setDescription('Member to check (leave empty for leaderboard)'))
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getMember('member');

    if (!target) {
      const top = getLeaderboard(interaction.guildId, 10);
      if (top.length === 0) {
        return interaction.reply('📨 No invites tracked yet. Invite someone with your own invite link and it will show up here.');
      }
      const medals = ['🥇', '🥈', '🥉'];
      const embed = new EmbedBuilder()
        .setTitle('📨 Invite Leaderboard')
        .setColor(0x5865f2)
        .setDescription(
          top.map((e, i) => `${medals[i] ?? `**${i + 1}.**`} <@${e.userId}> — **${e.count}** invite${e.count === 1 ? '' : 's'}`).join('\n')
        );
      return interaction.reply({ embeds: [embed] });
    }

    const count = getCount(interaction.guildId, target.id);
    const invited = getInvitedMembers(interaction.guildId, target.id, 10);
    const inviter = getInviterOf(interaction.guildId, target.id);

    const embed = new EmbedBuilder()
      .setTitle(`📨 ${target.user.username}'s invites`)
      .setColor(0x5865f2)
      .setThumbnail(target.user.displayAvatarURL())
      .addFields(
        { name: 'Active invites', value: `**${count}**`, inline: true },
        { name: 'Joined by', value: inviter ? `<@${inviter}>` : 'Unknown (vanity or bot-added)', inline: true }
      );

    if (invited.length) {
      embed.addFields({
        name: 'Members invited',
        value: invited.map((m) => `<@${m.memberId}> <t:${Math.floor(new Date(m.joinedAt) / 1000)}:R>`).join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
