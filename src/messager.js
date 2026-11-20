// Repeating message scheduler: posts an embed every N minutes/hours/days, X times.
const { EmbedBuilder } = require('discord.js');
const { load, save } = require('./store');

const MIN_INTERVAL = 60 * 1000;            // 1 minute
const MAX_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_AMOUNT = 500;

// "30m" / "2h" / "3d" / "45" (minutes) -> milliseconds
function parseInterval(input) {
  const s = String(input ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^(\d+(?:\.\d+)?)(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2] ?? 'm';
  let ms;
  if (unit.startsWith('m')) ms = n * 60 * 1000;
  else if (unit.startsWith('h')) ms = n * 60 * 60 * 1000;
  else if (unit.startsWith('d')) ms = n * 24 * 60 * 60 * 1000;
  else ms = n * 7 * 24 * 60 * 60 * 1000;
  if (ms < MIN_INTERVAL || ms > MAX_INTERVAL) return null;
  return Math.round(ms);
}

function humanInterval(ms) {
  if (ms % 86400000 === 0) return `${ms / 86400000}d`;
  if (ms % 3600000 === 0) return `${ms / 3600000}h`;
  return `${Math.round(ms / 60000)}m`;
}

// No footer, no author, no "automated" note - it reads like a normal announcement.
function buildEmbed(text) {
  return new EmbedBuilder().setColor(0x2b2d31).setDescription(text.slice(0, 4000));
}

function getJobs() {
  return load('messager').jobs ?? {};
}

function saveJobs(jobs) {
  save('messager', { jobs });
}

function addJob({ guildId, channelId, text, intervalMs, amount, createdBy }) {
  const jobs = getJobs();
  const id = Math.random().toString(36).slice(2, 8);
  jobs[id] = {
    id,
    guildId,
    channelId,
    text,
    intervalMs,
    amount,
    sent: 0,
    nextRun: Date.now() + intervalMs,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  saveJobs(jobs);
  return jobs[id];
}

function removeJob(id) {
  const jobs = getJobs();
  if (!jobs[id]) return false;
  delete jobs[id];
  saveJobs(jobs);
  return true;
}

// Called by the scheduler tick: returns the jobs that are due right now
function takeDue(now = Date.now()) {
  const jobs = getJobs();
  const due = Object.values(jobs).filter((j) => j.nextRun <= now && j.sent < j.amount);
  return due;
}

function advance(id, now = Date.now()) {
  const jobs = getJobs();
  const job = jobs[id];
  if (!job) return null;
  job.sent += 1;
  if (job.sent >= job.amount) {
    delete jobs[id];
    saveJobs(jobs);
    return null;
  }
  job.nextRun = now + job.intervalMs;
  saveJobs(jobs);
  return job;
}

async function runDue(client) {
  for (const job of takeDue()) {
    try {
      const channel = await client.channels.fetch(job.channelId).catch(() => null);
      if (!channel) {
        console.error(`Messager ${job.id}: channel ${job.channelId} not found, dropping job`);
        removeJob(job.id);
        continue;
      }
      await channel.send({ embeds: [buildEmbed(job.text)], allowedMentions: { parse: [] } });
      advance(job.id);
    } catch (err) {
      console.error(`Messager ${job.id} failed:`, err);
      // keep it scheduled, try again on the next tick
      const jobs = getJobs();
      if (jobs[job.id]) {
        jobs[job.id].nextRun = Date.now() + 60 * 1000;
        saveJobs(jobs);
      }
    }
  }
}

function startScheduler(client) {
  const tick = () => runDue(client).catch((e) => console.error('Messager tick failed:', e));
  setTimeout(tick, 10 * 1000);
  setInterval(tick, 30 * 1000);
}

module.exports = {
  parseInterval,
  humanInterval,
  buildEmbed,
  addJob,
  removeJob,
  getJobs,
  advance,
  takeDue,
  runDue,
  startScheduler,
  MAX_AMOUNT,
  MIN_INTERVAL,
  MAX_INTERVAL,
};
