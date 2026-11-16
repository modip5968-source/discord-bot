// Shared warning storage (data/warnings.json)
const { load, save } = require('./store');

const key = (guildId, userId) => `${guildId}:${userId}`;

function list(guildId, userId) {
  return load('warnings')[key(guildId, userId)] ?? [];
}

function add(guildId, userId, entry) {
  const data = load('warnings');
  const k = key(guildId, userId);
  data[k] = data[k] ?? [];
  data[k].push(entry);
  save('warnings', data);
  return data[k];
}

function removeLast(guildId, userId) {
  const data = load('warnings');
  const k = key(guildId, userId);
  const arr = data[k] ?? [];
  const removed = arr.pop() ?? null;
  data[k] = arr;
  save('warnings', data);
  return removed;
}

function clear(guildId, userId) {
  const data = load('warnings');
  const k = key(guildId, userId);
  const removed = (data[k] ?? []).length;
  delete data[k];
  save('warnings', data);
  return removed;
}

module.exports = { list, add, removeLast, clear };
