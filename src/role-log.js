// Shared "Role Added" / "Role Removed" log cards used by promo and demo.
const { EmbedBuilder } = require('discord.js');

const GREEN = 0x57f287;
const RED = 0xed4245;

function roleLogEmbed({ added, target, role, moderator, reason, thumbnail }) {
  const embed = new EmbedBuilder()
    .setColor(added ? GREEN : RED)
    .setTitle(added ? 'Role Added' : 'Role Removed')
    .addFields(
      { name: 'Target User', value: `${target}`, inline: true },
      { name: added ? 'Role Added' : 'Role Removed', value: `${role}`, inline: true },
      { name: 'Moderator', value: `${moderator}`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided' }
    )
    .setTimestamp();

  if (thumbnail) embed.setThumbnail(thumbnail);
  return embed;
}

module.exports = { roleLogEmbed, GREEN, RED };
