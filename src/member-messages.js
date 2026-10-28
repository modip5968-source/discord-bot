// Shared rendering for welcome / goodbye / boost messages.
const { EmbedBuilder } = require('discord.js');

const DEFAULTS = {
  welcome: 'Welcome {user} to **{server}**! 🎉 You are member **#{count}**.',
  goodbye: '👋 **{username}** left **{server}**. Now **{count}** members.',
  boost: '🚀 {user} just boosted **{server}**! Thank you so much 💜',
};

const COLORS = { welcome: 0x57f287, goodbye: 0x99aab5, boost: 0xf47fff };

// Replace placeholders in a template string
function render(template, ctx = {}) {
  return String(template)
    .replaceAll('{user}', ctx.mention ?? ctx.username ?? '')
    .replaceAll('{username}', ctx.username ?? '')
    .replaceAll('{tag}', ctx.tag ?? ctx.username ?? '')
    .replaceAll('{server}', ctx.server ?? '')
    .replaceAll('{count}', ctx.count !== undefined ? String(ctx.count) : '')
    .replaceAll('{inviter}', ctx.inviterId ? `<@${ctx.inviterId}>` : 'an unknown invite')
    .replaceAll('{created}', ctx.createdAt ?? '');
}

// Build a send payload for the given kind ('welcome' | 'goodbye' | 'boost')
function buildPayload(kind, cfg, ctx = {}) {
  const key = kind;
  const text = render(cfg[`${key}Message`] ?? DEFAULTS[key], ctx);
  const asEmbed = cfg[`${key}Embed`] ?? true;

  if (!asEmbed) return { content: text, allowedMentions: { parse: [] } };

  const embed = new EmbedBuilder()
    .setColor(COLORS[key] ?? 0x5865f2)
    .setDescription(text)
    .setTimestamp();

  if (['welcome', 'goodbye', 'boost'].includes(kind) && ctx.avatarUrl) {
    embed.setThumbnail(ctx.avatarUrl);
  }
  if (ctx.footer) embed.setFooter({ text: ctx.footer });
  return { embeds: [embed], allowedMentions: { parse: [] } };
}

module.exports = { DEFAULTS, COLORS, render, buildPayload };
