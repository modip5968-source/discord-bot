// Auto Middleman system: strict, logged MM trade tickets.
// The bot never holds items - a human with the MM role does. The bot enforces the process.
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} = require('discord.js');
const { load, save } = require('./store');

const MAX_OPEN_TRADES = 3;
const CLOSE_DELAY_MS = 15000;

const STAGE_LABEL = {
  terms: '1️⃣ Traders confirm the terms',
  claim: '2️⃣ Waiting for a middleman to claim',
  escrow: '3️⃣ Middleman collecting items',
  release: '4️⃣ Middleman released items - traders confirm receipt',
  done: '✅ Trade complete',
  cancelled: '❌ Cancelled',
};

const STORE = 'middleman';

// ---------- storage ----------

function data() {
  const d = load(STORE);
  if (!d.config) d.config = {};
  if (!d.trades) d.trades = {};
  return d;
}

function setConfig(guildId, cfg) {
  const d = data();
  d.config[guildId] = cfg;
  save(STORE, d);
}

function getConfig(guildId) {
  return data().config[guildId] ?? null;
}

function getTrade(channelId) {
  return data().trades[channelId] ?? null;
}

const TRADE_FIELDS = ['reqOk', 'parOk', 'reqGot', 'parGot', 'mmId', 'stage'];

function updateTrade(channelId, fields) {
  const d = data();
  const trade = d.trades[channelId];
  if (!trade) return null;
  for (const [k, v] of Object.entries(fields)) {
    if (TRADE_FIELDS.includes(k)) trade[k] = v;
  }
  save(STORE, d);
  return trade;
}

function createTrade(channelId, trade) {
  const d = data();
  d.trades[channelId] = {
    reqOk: false,
    parOk: false,
    reqGot: false,
    parGot: false,
    mmId: null,
    stage: 'terms',
    createdAt: new Date().toISOString(),
    ...trade,
  };
  save(STORE, d);
  return d.trades[channelId];
}

function isMiddleman(member, cfg) {
  return Boolean(cfg?.mmRoleId && member?.roles?.cache?.has(cfg.mmRoleId));
}

// ---------- rendering ----------

const tick = (v) => (v ? '✅' : '⬜');

function tradeEmbed(trade) {
  const color =
    { done: 0x57f287, cancelled: 0xed4245 }[trade.stage] ?? 0x5865f2;

  return new EmbedBuilder()
    .setTitle('🤝 Middleman Trade')
    .setColor(color)
    .addFields(
      { name: 'Trader 1 gives', value: `<@${trade.requesterId}>\n${trade.give}`, inline: true },
      { name: 'Trader 2 gives', value: `<@${trade.partnerId}>\n${trade.get}`, inline: true },
      {
        name: 'Status',
        value: [
          `**Stage:** ${STAGE_LABEL[trade.stage] ?? trade.stage}`,
          `**Middleman:** ${trade.mmId ? `<@${trade.mmId}>` : 'Unclaimed'}`,
          `${tick(trade.reqOk)} Trader 1 confirmed · ${tick(trade.parOk)} Trader 2 confirmed`,
          `${tick(trade.reqGot)} Trader 1 received · ${tick(trade.parGot)} Trader 2 received`,
        ].join('\n'),
      }
    )
    .setFooter({
      text: 'Only the middleman shown above is legit. Never send items to anyone else or outside this ticket.',
    });
}

function components(disabled = false, showClaim = true) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mm:confirm').setLabel('Confirm Terms').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(disabled),
      showClaim
        ? new ButtonBuilder().setCustomId('mm:claim').setLabel('Claim (Middleman)').setEmoji('🛡️').setStyle(ButtonStyle.Primary).setDisabled(disabled)
        : new ButtonBuilder().setCustomId('mm:noop').setLabel('Claimed').setEmoji('🛡️').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId('mm:collected').setLabel('Items Collected').setEmoji('📦').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mm:received').setLabel('I Received My Items').setEmoji('🎁').setStyle(ButtonStyle.Success).setDisabled(disabled),
      new ButtonBuilder().setCustomId('mm:cancel').setLabel('Cancel').setEmoji('✖️').setStyle(ButtonStyle.Danger).setDisabled(disabled)
    ),
  ];
}

// ---------- opening a trade ----------

async function startTrade(interaction, partner) {
  const cfg = getConfig(interaction.guildId);
  if (!cfg) {
    return interaction.reply({
      content: 'The middleman system is not set up yet. An admin needs to run `/mm-setup`.',
      ephemeral: true,
    });
  }
  if (partner.bot || partner.id === interaction.user.id) {
    return interaction.reply({ content: 'Pick a real person other than yourself.', ephemeral: true });
  }

  const d = data();
  const open = Object.values(d.trades).filter(
    (t) =>
      t.guildId === interaction.guildId &&
      t.requesterId === interaction.user.id &&
      !['done', 'cancelled'].includes(t.stage)
  ).length;
  if (open >= MAX_OPEN_TRADES) {
    return interaction.reply({
      content: `You already have ${open} open middleman tickets. Finish or cancel one first.`,
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`mm:modal:${partner.id}`)
    .setTitle('Trade details')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('give')
          .setLabel('What are YOU giving?')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(300)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('get')
          .setLabel('What is your PARTNER giving?')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(300)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
}

// Modal submitted -> create the private ticket
async function handleModal(interaction) {
  const partnerId = interaction.customId.split(':')[2];
  const cfg = getConfig(interaction.guildId);
  if (!cfg) {
    return interaction.reply({ content: 'Middleman system is not configured.', ephemeral: true });
  }

  const guild = interaction.guild;
  const partner = await guild.members.fetch(partnerId).catch(() => null);
  if (!partner) {
    return interaction.reply({ content: 'Could not find that trade partner.', ephemeral: true });
  }

  const mmRole = guild.roles.cache.get(cfg.mmRoleId);
  if (!mmRole) {
    return interaction.reply({
      content: 'The middleman role is missing - an admin needs to re-run `/mm-setup`.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const see = {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  };
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: Object.entries(see).map(([k]) => PermissionFlagsBits[k]) },
    { id: partner.id, allow: Object.entries(see).map(([k]) => PermissionFlagsBits[k]) },
    { id: mmRole.id, allow: Object.entries(see).map(([k]) => PermissionFlagsBits[k]) },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  const channel = await guild.channels.create({
    name: `trade-${interaction.user.username}`.slice(0, 90),
    type: 0,
    parent: cfg.categoryId ?? null,
    permissionOverwrites: overwrites,
    reason: 'Middleman trade ticket',
  });

  const trade = createTrade(channel.id, {
    guildId: guild.id,
    requesterId: interaction.user.id,
    partnerId: partner.id,
    give: String(interaction.fields.getTextInputValue('give')).slice(0, 300),
    get: String(interaction.fields.getTextInputValue('get')).slice(0, 300),
  });

  await channel.send({
    content: `${interaction.user} ${partner} welcome! Check the terms below. **Both traders must press Confirm Terms**, then a middleman will claim the ticket.`,
    embeds: [tradeEmbed(trade)],
    components: components(),
  });

  await interaction.editReply({ content: `Ticket created: ${channel}` });
}

// ---------- finishing ----------

async function buildTranscript(channel) {
  const lines = [];
  let lastId;
  // page backwards then reverse, to stay within memory/time on long tickets
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch || batch.size === 0) break;
    for (const m of batch.values()) {
      const ts = new Date(m.createdTimestamp).toISOString().replace('T', ' ').slice(0, 19);
      const text = m.content || (m.embeds.length ? '[embed]' : m.attachments.size ? '[attachment]' : '');
      lines.push(`[${ts} UTC] ${m.author.username} (${m.author.id}): ${text}`);
    }
    lastId = batch.last().id;
  }
  return lines.reverse().join('\n');
}

async function finishTrade(channel, outcome) {
  const trade = getTrade(channel.id);
  const cfg = trade ? getConfig(trade.guildId) : null;
  const log = cfg?.logChannelId ? channel.guild.channels.cache.get(cfg.logChannelId) : null;

  if (log && trade) {
    try {
      const transcript = await buildTranscript(channel);
      const file = new AttachmentBuilder(Buffer.from(transcript || '(empty)', 'utf8'), {
        name: `trade-${channel.id}.txt`,
      });
      const embed = tradeEmbed(trade).setTitle(`Trade log - ${outcome}`);
      await log.send({ embeds: [embed], files: [file] });
    } catch (err) {
      console.error('MM transcript failed:', err);
    }
  }

  await channel.send(`This ticket closes in ${CLOSE_DELAY_MS / 1000} seconds.`).catch(() => {});
  setTimeout(() => channel.delete(`Middleman trade ${outcome}`).catch(() => {}), CLOSE_DELAY_MS);
}

// ---------- buttons ----------

async function deny(interaction, msg) {
  return interaction.reply({ content: msg, ephemeral: true });
}

async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId === 'mm:request') {
    const row = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder().setCustomId('mm:pickpartner').setPlaceholder('Pick your trade partner')
    );
    return interaction.reply({ content: 'Who are you trading with?', components: [row], ephemeral: true });
  }

  const trade = getTrade(interaction.channelId);
  if (!trade) return deny(interaction, 'This is not a middleman ticket.');
  const cfg = getConfig(trade.guildId);
  const uid = interaction.user.id;
  const isTrader = uid === trade.requesterId || uid === trade.partnerId;
  const isMm = isMiddleman(interaction.member, cfg);

  if (customId === 'mm:confirm') {
    if (!isTrader) return deny(interaction, 'Only the two traders can confirm terms.');
    if (trade.stage !== 'terms') return deny(interaction, 'Terms are already locked in.');

    const updated = updateTrade(interaction.channelId, {
      [uid === trade.requesterId ? 'reqOk' : 'parOk']: true,
    });
    const both = updated.reqOk && updated.parOk;
    if (both) updated.stage = 'claim';
    if (both) updateTrade(interaction.channelId, { stage: 'claim' });

    await interaction.update({ embeds: [tradeEmbed(updated)], components: components() });

    if (both) {
      const role = interaction.guild.roles.cache.get(cfg.mmRoleId);
      await interaction.channel
        .send({
          content: `${role ? `<@&${role.id}>` : 'Middlemen'} both traders locked in the terms. A middleman, please **claim** this ticket.`,
          allowedMentions: { roles: role ? [role.id] : [] },
        })
        .catch(() => {});
    }
    return;
  }

  if (customId === 'mm:claim') {
    if (!isMm) return deny(interaction, 'Only middlemen can claim tickets.');
    if (isTrader) return deny(interaction, "You can't middleman your own trade.");
    if (trade.stage !== 'claim') return deny(interaction, "This ticket isn't waiting for a middleman.");

    const updated = updateTrade(interaction.channelId, { mmId: uid, stage: 'escrow' });
    await interaction.update({ embeds: [tradeEmbed(updated)], components: components() });
    await interaction.channel
      .send(
        `🛡️ ${interaction.user} is your middleman. Traders: send your items **only to this middleman**, then wait for them to confirm everything is collected.`
      )
      .catch(() => {});
    return;
  }

  if (customId === 'mm:collected') {
    if (!isMm) return deny(interaction, 'Only the middleman can mark items collected.');
    if (trade.mmId !== uid) return deny(interaction, 'Only the middleman handling this trade can do that.');
    if (trade.stage !== 'escrow') return deny(interaction, 'This trade is not in the collecting stage.');

    const updated = updateTrade(interaction.channelId, { stage: 'release' });
    await interaction.update({ embeds: [tradeEmbed(updated)], components: components() });
    await interaction.channel
      .send(
        '📦 Middleman released the items. ' +
          `<@${trade.requesterId}> and <@${trade.partnerId}> - press **I Received My Items** once you have yours.`
      )
      .catch(() => {});
    return;
  }

  if (customId === 'mm:received') {
    if (!isTrader) return deny(interaction, 'Only the two traders can confirm receipt.');
    if (trade.stage !== 'release') return deny(interaction, "Items haven't been released yet.");

    const updated = updateTrade(interaction.channelId, {
      [uid === trade.requesterId ? 'reqGot' : 'parGot']: true,
    });

    if (updated.reqGot && updated.parGot) {
      const done = updateTrade(interaction.channelId, { stage: 'done' });
      await interaction.update({ embeds: [tradeEmbed(done)], components: components(true) });
      await interaction.channel.send('🎉 Both traders confirmed. Trade complete!').catch(() => {});
      await finishTrade(interaction.channel, 'completed');
    } else {
      await interaction.update({ embeds: [tradeEmbed(updated)], components: components() });
    }
    return;
  }

  if (customId === 'mm:cancel') {
    const traderCanCancel = isTrader && ['terms', 'claim'].includes(trade.stage);
    if (!traderCanCancel && !isMm) {
      return deny(
        interaction,
        'Traders can only cancel before a middleman collects items. Ask the middleman to cancel.'
      );
    }

    const updated = updateTrade(interaction.channelId, { stage: 'cancelled' });
    await interaction.update({ embeds: [tradeEmbed(updated)], components: components(true) });
    await interaction.channel.send(`❌ Cancelled by ${interaction.user}.`).catch(() => {});
    await finishTrade(interaction.channel, 'cancelled');
    return;
  }

  return deny(interaction, 'Unknown action.');
}

// User select from the panel
async function handleUserSelect(interaction) {
  const partnerId = interaction.values[0];
  const partner = await interaction.guild.members.fetch(partnerId).catch(() => null);
  if (!partner) return interaction.reply({ content: 'Could not find that member.', ephemeral: true });
  return startTrade(interaction, partner);
}

module.exports = {
  STAGE_LABEL,
  setConfig,
  getConfig,
  getTrade,
  tradeEmbed,
  startTrade,
  handleModal,
  handleButton,
  handleUserSelect,
};
