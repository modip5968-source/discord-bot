// Invite tracking: records who invited each member (and removes credit when they leave).
const { load, save } = require('./store');

// guildId -> Map(inviteCode -> uses)
const cache = new Map();

async function snapshot(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const inv of invites.values()) map.set(inv.code, inv.uses ?? 0);
    cache.set(guild.id, map);
    return map;
  } catch {
    // missing Manage Server permission: tracking silently disabled for this guild
    return null;
  }
}

async function cacheAll(client) {
  let count = 0;
  for (const guild of client.guilds.cache.values()) {
    if (await snapshot(guild)) count++;
  }
  if (count) console.log(`Invites: cached invite uses for ${count} server(s)`);
}

// Keep the cache fresh when invites are created or deleted
function onInviteCreate(invite) {
  const map = cache.get(invite.guild?.id) ?? new Map();
  map.set(invite.code, invite.uses ?? 0);
  cache.set(invite.guild?.id, map);
}

function onInviteDelete(invite) {
  const map = cache.get(invite.guild?.id);
  if (map) map.delete(invite.code);
}

// Find which invite was used when a member joins, and record the inviter
async function recordJoin(member) {
  const before = cache.get(member.guild.id) ?? new Map();
  let inviter = null;
  let usedCode = null;

  try {
    const invites = await member.guild.invites.fetch();
    let best = null;
    for (const inv of invites.values()) {
      const previous = before.get(inv.code) ?? 0;
      const used = (inv.uses ?? 0) - previous;
      if (used > 0 && (!best || used > best.used)) {
        best = { inviter: inv.inviter, code: inv.code, used };
      }
    }
    if (best) {
      inviter = best.inviter;
      usedCode = best.code;
    }

    // refresh the cache to current counts
    const map = new Map();
    for (const inv of invites.values()) map.set(inv.code, inv.uses ?? 0);
    cache.set(member.guild.id, map);
  } catch {
    // no permission: leave inviter unknown
  }

  const data = load('invites');
  const guild = data[member.guild.id] ?? (data[member.guild.id] = { members: {}, counts: {} });
  guild.members[member.id] = {
    inviterId: inviter?.id ?? null,
    code: usedCode,
    joinedAt: new Date().toISOString(),
    left: false,
  };
  if (inviter) guild.counts[inviter.id] = (guild.counts[inviter.id] ?? 0) + 1;
  save('invites', data);

  return { inviter, code: usedCode };
}

// Remove credit when someone leaves (so counts reflect members who stayed)
function recordLeave(member) {
  const data = load('invites');
  const guild = data[member.guild.id];
  const record = guild?.members?.[member.id];
  if (!record || record.left) return null;

  record.left = true;
  if (record.inviterId && guild.counts[record.inviterId]) {
    guild.counts[record.inviterId] = Math.max(0, guild.counts[record.inviterId] - 1);
  }
  save('invites', data);
  return record;
}

function getCount(guildId, userId) {
  return load('invites')[guildId]?.counts?.[userId] ?? 0;
}

function getLeaderboard(guildId, limit = 10) {
  const counts = load('invites')[guildId]?.counts ?? {};
  return Object.entries(counts)
    .map(([userId, count]) => ({ userId, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getInvitedMembers(guildId, userId, limit = 15) {
  const members = load('invites')[guildId]?.members ?? {};
  return Object.entries(members)
    .filter(([, record]) => record.inviterId === userId && !record.left)
    .map(([memberId, record]) => ({ memberId, ...record }))
    .reverse()
    .slice(0, limit);
}

function getInviterOf(guildId, userId) {
  return load('invites')[guildId]?.members?.[userId]?.inviterId ?? null;
}

module.exports = {
  cacheAll,
  snapshot,
  onInviteCreate,
  onInviteDelete,
  recordJoin,
  recordLeave,
  getCount,
  getLeaderboard,
  getInvitedMembers,
  getInviterOf,
};
