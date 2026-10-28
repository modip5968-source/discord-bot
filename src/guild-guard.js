// Anti-theft guard: the bot only stays in allowlisted servers and
// instantly leaves any server not on the list.
const { load } = require('./store');

// Default allowlist — can be overridden by data/allowlist.json → { "guildIds": ["..."] }
const DEFAULT_ALLOWED = [
  '1523352502953840660', // GAMERS.gg | MARKETPLACE
  '1550700766564589578', // BlazeXStudio | Aru<3
  '1563909583884259411', // TEST SERVER | SHOP BOT
];

function getConfig() {
  const data = load('allowlist');
  return {
    allowed: new Set(data.guildIds ?? DEFAULT_ALLOWED),
    // reportOnly: log new servers but do NOT leave (used while whitelisting a new server)
    reportOnly: Boolean(data.reportOnly),
  };
}

function getAllowed() {
  return getConfig().allowed;
}

// On startup: leave every server not on the allowlist
async function enforceAll(client) {
  const { allowed, reportOnly } = getConfig();
  let left = 0;
  for (const guild of client.guilds.cache.values()) {
    if (!allowed.has(guild.id)) {
      if (reportOnly) {
        console.log(`Guild guard [report-only]: not in allowlist: "${guild.name}" (${guild.id})`);
        continue;
      }
      try {
        await guild.leave();
        left++;
        console.log(`Guild guard: left unauthorized server "${guild.name}" (${guild.id})`);
      } catch (err) {
        console.error(`Guild guard: could not leave ${guild.id}:`, err.message);
      }
    }
  }
  return left;
}

// On join: leave immediately unless allowlisted
async function checkJoin(guild) {
  const { allowed, reportOnly } = getConfig();
  if (allowed.has(guild.id)) return false;
  if (reportOnly) {
    console.log(`Guild guard [report-only]: NEW SERVER "${guild.name}" (${guild.id}) — staying (whitelist it)`);
    return false;
  }
  console.log(`Guild guard: added to unauthorized server "${guild.name}" (${guild.id}) — leaving`);
  await guild.leave().catch(() => {});
  return true;
}

module.exports = { enforceAll, checkJoin, getAllowed, getConfig, DEFAULT_ALLOWED };
