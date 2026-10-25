// Level/XP logic: 15-30 XP per message (60s cooldown), level L at 50*L*(L+1) total XP.
const { load, save } = require('./store');
const cooldowns = new Map();

// Total XP needed to reach a given level
function xpForLevel(level) {
  return 50 * level * (level + 1);
}

// The level someone with this much total XP has
function levelFromXp(xp) {
  let level = 0;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

async function addXp(message) {
  const now = Date.now();
  const last = cooldowns.get(message.author.id) ?? 0;
  if (now - last < 60000) return null;
  cooldowns.set(message.author.id, now);

  const data = load('levels');
  const guild = data[message.guildId] ?? (data[message.guildId] = {});
  const entry = guild[message.author.id] ?? (guild[message.author.id] = { xp: 0, messages: 0 });

  const before = levelFromXp(entry.xp);
  entry.xp += Math.floor(Math.random() * 16) + 15; // 15-30
  entry.messages += 1;
  const after = levelFromXp(entry.xp);
  save('levels', data);

  return after > before ? { level: after, leveledUp: true } : { level: after, leveledUp: false };
}

function getStats(guildId, userId) {
  const data = load('levels');
  return data[guildId]?.[userId] ?? { xp: 0, messages: 0 };
}

function getLeaderboard(guildId, limit = 10) {
  const data = load('levels');
  const guild = data[guildId] ?? {};
  return Object.entries(guild)
    .map(([userId, { xp, messages }]) => ({ userId, xp, messages }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

module.exports = { addXp, levelFromXp, xpForLevel, getStats, getLeaderboard };
