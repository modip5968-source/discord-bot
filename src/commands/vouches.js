const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../store');

function stars(n) {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  if (!v) return null;
  return '⭐'.repeat(v) + '☆'.repeat(5 - v);
}

module.exports = {
  stars,
  data: new SlashCommandBuilder()
    .setName('vouches')
    .setDescription("Show a member's vouches (reputation)")
    .addUserOption((o) => o.setName('member').setDescription('Member (defaults to you)'))
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member') ?? interaction.member;
    const vouches = load('vouches')[`${interaction.guildId}:${member.id}`] ?? {};
    const entries = Object.entries(vouches).sort((a, b) => new Date(b[1].at) - new Date(a[1].at));
    const imported = entries.filter(([, v]) => v.imported).length;
    const live = entries.length - imported;
    const rated = entries.map(([, v]) => Number(v.rating)).filter((r) => r >= 1 && r <= 5);
    const avg = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : null;

    const summary = entries.length
      ? [
          `**${entries.length} vouch${entries.length === 1 ? '' : 'es'}**` +
            (imported ? ` — ${live} from this bot, ${imported} imported` : '') +
            (avg ? `\n**Average rating:** ${avg} / 5` : ''),
        ].join('\n')
      : 'No vouches yet.';

    const list = entries
      .slice(0, 10)
      .map(([byId, v]) => {
        const bits = [v.rating ? stars(v.rating) : null, v.comment].filter(Boolean).join(' ');
        const tag = v.imported ? ' *(imported)*' : '';
        const trade = v.trade ? ` · ${v.trade}` : '';
        return `> ${bits}\n> — <@${byId}>, <t:${Math.floor(new Date(v.at) / 1000)}:R>${trade}${tag}`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Vouches for ${member.user.username}`)
      .setColor(0xfee75c)
      .setDescription(entries.length ? `${summary}\n\n${list}` : summary);

    await interaction.reply({ embeds: [embed] });
  },
};
