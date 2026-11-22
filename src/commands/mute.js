const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modlog = require('../modlog');

const MAX_MS = 28 * 24 * 60 * 60 * 1000; // Discord's timeout cap

// "1m", "30m", "2h", "1d", "1h30m", or a bare number meaning minutes
function parseDuration(input) {
  const text = String(input ?? '').trim().toLowerCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text) * 60_000;

  const re = /(\d+)\s*(mo|[smhdw])/g;
  let total = 0;
  let matched = false;
  let m;
  while ((m = re.exec(text)) !== null) {
    matched = true;
    const n = Number(m[1]);
    const unit = m[2];
    const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000, mo: 2_592_000_000 }[unit];
    total += n * mult;
  }
  return matched ? total : null;
}

function humanize(ms) {
  const parts = [];
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute (time out) a member for a set time, e.g. 1m / 1h / 1d')
    .addUserOption((o) => o.setName('user').setDescription('The member to mute').setRequired(true))
    .addStringOption((o) => o.setName('time').setDescription('How long: 1m, 30m, 2h, 1d (max 28d)').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the mute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const time = interaction.options.getString('time');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

    const ms = parseDuration(time);
    if (!ms || ms < 1000) {
      return interaction.reply({ content: 'Unreadable time. Use something like `1m`, `30m`, `2h`, `1d`.', ephemeral: true });
    }
    if (ms > MAX_MS) {
      return interaction.reply({ content: 'Discord only allows mutes up to **28 days**.', ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({ content: 'I cannot mute that member (role hierarchy or missing permissions).', ephemeral: true });
    }

    await member.timeout(ms, `${reason} — by ${interaction.user.tag}`);
    await modlog.deliver(interaction, { content: `${member} has been timed out | Reason: ${reason}`, embed: modlog.timedOut({
          target: member.user,
          moderator: interaction.user,
          reason,
          duration: humanize(ms),
        }), allowedMentions: { users: [member.id] } });

    try {
      await member.send(`You were muted in **${interaction.guild.name}** for ${humanize(ms)}. Reason: ${reason}`);
    } catch {}
  },
  parseDuration,
  humanize,
};
