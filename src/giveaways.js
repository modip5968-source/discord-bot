// Giveaway engine: persistent (survives restarts), button entry, auto-end, reroll.
const { load, save } = require('./store');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const timers = new Map();

function getGiveaway(id) {
  return load('giveaways')[id] ?? null;
}

function putGiveaway(gw) {
  const data = load('giveaways');
  data[gw.id] = gw;
  save('giveaways', data);
}

function buildEmbed(gw, ended = false, winners = []) {
  const end = `<t:${Math.floor(gw.endsAt / 1000)}:R>`;
  const embed = new EmbedBuilder()
    .setTitle(`${ended ? '🏁' : '🎉'} Giveaway: ${gw.prize}`)
    .setColor(ended ? 0x99aab5 : 0x5865f2)
    .addFields(
      { name: 'Winners', value: `${gw.winners}`, inline: true },
      { name: 'Entries', value: `${gw.participants.length}`, inline: true },
      { name: ended ? 'Status' : 'Ends', value: ended ? 'Ended' : end, inline: true }
    )
    .setFooter({ text: `Giveaway ID: ${gw.id}` });
  if (ended && winners.length) {
    embed.setDescription(`**Winner${winners.length > 1 ? 's' : ''}:** ${winners.map((w) => `<@${w}>`).join(' ')}\nCongratulations! 🥳`);
  } else if (ended) {
    embed.setDescription('No valid entries, no winner was drawn.');
  } else {
    embed.setDescription('Click the **Enter** button below to join!');
  }
  return embed;
}

function buttons(gw, ended = false) {
  if (ended) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`gw:${gw.id}:reroll`).setLabel('🔄 Reroll').setStyle(ButtonStyle.Secondary)
      ),
    ];
  }
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`gw:${gw.id}:join`).setLabel('🎉 Enter').setStyle(ButtonStyle.Success)
    ),
  ];
}

function pickWinners(gw) {
  const pool = [...new Set(gw.participants)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(gw.winners, pool.length));
}

async function endGiveaway(client, id) {
  const gw = getGiveaway(id);
  if (!gw || gw.ended) return;
  const winners = pickWinners(gw);
  gw.ended = true;
  gw.winnerIds = winners;
  putGiveaway(gw);
  if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
  }

  let channel;
  try {
    channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(gw.messageId);
    await message.edit({ embeds: [buildEmbed(gw, true, winners)], components: buttons(gw, true) });
  } catch {
    // channel/message gone; giveaway stays recorded as ended
  }
  if (channel && winners.length) {
    await channel
      .send(`🎊 Congratulations ${winners.map((w) => `<@${w}>`).join(' ')}! You won **${gw.prize}**!`)
      .catch(() => {});
  }
}

async function reroll(client, id) {
  const gw = getGiveaway(id);
  if (!gw || !gw.ended) return null;
  const winners = pickWinners(gw);
  gw.winnerIds = winners;
  putGiveaway(gw);
  try {
    const channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(gw.messageId);
    await message.edit({ embeds: [buildEmbed(gw, true, winners)], components: buttons(gw, true) });
    if (winners.length) {
      await channel.send(`🔄 Reroll! New winner${winners.length > 1 ? 's' : ''}: ${winners.map((w) => `<@${w}>`).join(' ')} — **${gw.prize}**`);
    }
  } catch {
    // ignore
  }
  return winners;
}

function scheduleEnd(client, gw) {
  const ms = gw.endsAt - Date.now();
  if (ms <= 0) {
    endGiveaway(client, gw.id).catch((e) => console.error('Giveaway end failed:', e));
    return;
  }
  const t = setTimeout(() => {
    timers.delete(gw.id);
    endGiveaway(client, gw.id).catch((e) => console.error('Giveaway end failed:', e));
  }, ms);
  timers.set(gw.id, t);
}

// Called on startup: resume unfinished giveaways (and end overdue ones)
function resumeAll(client) {
  const data = load('giveaways');
  let resumed = 0;
  let ended = 0;
  for (const gw of Object.values(data)) {
    if (gw.ended) continue;
    if (gw.endsAt <= Date.now()) {
      endGiveaway(client, gw.id).catch(() => {});
      ended++;
    } else {
      scheduleEnd(client, gw);
      resumed++;
    }
  }
  if (resumed || ended) console.log(`Giveaways: resumed ${resumed}, closed ${ended} overdue`);
}

async function createGiveaway(interaction, { prize, winners, minutes, channel }) {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const gw = {
    id,
    guildId: interaction.guildId,
    channelId: channel.id,
    prize,
    winners,
    endsAt: Date.now() + minutes * 60000,
    participants: [],
    ended: false,
    hostId: interaction.user.id,
  };

  const message = await channel.send({ embeds: [buildEmbed(gw)], components: buttons(gw) });
  gw.messageId = message.id;
  putGiveaway(gw);
  scheduleEnd(interaction.client, gw);
  return gw;
}

module.exports = { createGiveaway, endGiveaway, reroll, resumeAll, getGiveaway, putGiveaway, buildEmbed, buttons };
