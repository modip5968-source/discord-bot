const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouches')
    .setDescription("Show a member's vouches (reputation)")
    .addUserOption((o) => o.setName('member').setDescription('Member (defaults to you)'))
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member') ?? interaction.member;
    const vouches = load('vouches')[`${interaction.guildId}:${member.id}`] ?? {};
    const entries = Object.entries(vouches).sort((a, b) => new Date(b[1].at) - new Date(a[1].at));

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Vouches for ${member.user.username}`)
      .setColor(0xfee75c)
      .setDescription(
        entries.length === 0
          ? 'No vouches yet. Buy something and leave one with `/vouch`!'
          : `**${entries.length} vouch${entries.length === 1 ? '' : 'es'}**\n\n` +
            entries.slice(0, 10).map(([byId, v]) => `> ${v.comment}\n> — <@${byId}>, <t:${Math.floor(new Date(v.at) / 1000)}:R>`).join('\n')
      );
    await interaction.reply({ embeds: [embed] });
  },
};
