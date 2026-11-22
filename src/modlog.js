// Professional moderation log cards - same look as the JMS style:
// coloured bar, stacked labelled fields, target avatar as thumbnail.
const { EmbedBuilder } = require('discord.js');

const COLORS = {
  warn: 0xfaa61a,        // amber
  timeout: 0xe67e22,     // orange
  kick: 0xe67e22,        // orange
  ban: 0xed4245,         // red
  unban: 0x57f287,       // green
  unmute: 0x57f287,      // green
  warnRemoved: 0x57f287, // green
  purge: 0x5865f2,       // blue
  nuke: 0x95a5a6,        // grey
};

function card({ title, color, fields = [], thumbnail }) {
  const embed = new EmbedBuilder().setColor(color).setTitle(title);
  if (fields.length) {
    embed.addFields(
      fields
        .filter((f) => f && f.value !== undefined && f.value !== null && `${f.value}`.length)
        .map((f) => ({ name: f.name, value: `${f.value}`, inline: Boolean(f.inline) }))
    );
  }
  if (thumbnail) embed.setThumbnail(thumbnail);
  return embed;
}

const avatarOf = (user) => (user?.displayAvatarURL ? user.displayAvatarURL() : null);

// --- ready-made cards -------------------------------------------------------

const warned = ({ target, moderator, reason, count }) =>
  card({
    title: 'Member Warned',
    color: COLORS.warn,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'Target User', value: `${target}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Warn Number', value: `#${count}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const warningRemoved = ({ target, moderator, reason, originalModerator, left }) =>
  card({
    title: 'Warning Removed',
    color: COLORS.warnRemoved,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'User', value: `${target}` },
      { name: 'Removed By', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
      { name: 'Original Moderator', value: originalModerator || 'Unknown' },
      { name: 'Warnings Left', value: `${left}` },
    ],
  });

const timedOut = ({ target, moderator, reason, duration }) =>
  card({
    title: 'User Timed Out',
    color: COLORS.timeout,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'User', value: `${target}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Duration', value: duration },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const timeoutRemoved = ({ target, moderator, reason }) =>
  card({
    title: 'Timeout Removed',
    color: COLORS.unmute,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'User', value: `${target}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const banned = ({ target, moderator, reason }) =>
  card({
    title: 'User Banned',
    color: COLORS.ban,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'Target User', value: `${target}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const unbanned = ({ target, moderator, reason }) =>
  card({
    title: 'User Unbanned',
    color: COLORS.unban,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'Target User', value: `${target}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const kicked = ({ target, moderator, reason }) =>
  card({
    title: 'Member Kicked',
    color: COLORS.kick,
    thumbnail: avatarOf(target),
    fields: [
      { name: 'Target User', value: `${target}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const purged = ({ channel, amount, moderator, reason, target }) =>
  card({
    title: 'Messages Purged',
    color: COLORS.purge,
    fields: [
      { name: 'Channel', value: `${channel}` },
      { name: 'Amount', value: `${amount}` },
      ...(target ? [{ name: 'Filtered User', value: `${target}` }] : []),
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

const nuked = ({ channel, moderator, reason }) =>
  card({
    title: 'Channel Nuked',
    color: COLORS.nuke,
    fields: [
      { name: 'Channel', value: `${channel}` },
      { name: 'Moderator', value: `${moderator}` },
      { name: 'Reason', value: reason || 'No reason provided' },
    ],
  });

module.exports = {
  COLORS,
  card,
  warned,
  warningRemoved,
  timedOut,
  timeoutRemoved,
  banned,
  unbanned,
  kicked,
  purged,
  nuked,
};
