// Auto vouches: posted automatically when a middleman trade completes.
// Each trader can add their rating + review with a button, which updates the vouch embed.
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { load, save } = require('./store');

const CONFIG = 'vouch-config';
const RECORDS = 'trade-vouches';

// ---------- config ----------

function getVouchChannelId(guildId) {
  return load(CONFIG)[guildId]?.channelId ?? null;
}

function setVouchChannelId(guildId, channelId) {
  const d = load(CONFIG);
  d[guildId] = { ...(d[guildId] ?? {}), channelId };
  save(CONFIG, d);
}

// ---------- records ----------

function records() {
  const d = load(RECORDS);
  return d && typeof d === 'object' ? d : {};
}

function getRecord(id) {
  return records()[id] ?? null;
}

function saveRecord(record) {
  const d = records();
  d[record.id] = record;
  save(RECORDS, d);
}

// ---------- rendering ----------

function stars(rating) {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}

function reviewBlock(record, traderId) {
  const review = record.reviews?.[traderId];
  const traded = traderId === record.requesterId ? record.give : record.get;
  if (!review) {
    return `**traded:** ${traded || '—'}\n*Waiting for their review…*`;
  }
  return [
    `**traded:** ${traded || '—'}`,
    `${stars(review.rating)}`,
    review.comment ? `*${review.comment}*` : null,
    review.image ? `[proof](${review.image})` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildVouchEmbed(record) {
  const embed = new EmbedBuilder()
    .setTitle('✅ New Vouch')
    .setColor(0x57f287)
    .setDescription(`**${record.give || 'Items'} ↔ ${record.get || 'Items'}**`)
    .addFields(
      { name: 'trader 1', value: `<@${record.requesterId}>`, inline: true },
      { name: 'trader 2', value: `<@${record.partnerId}>`, inline: true },
      { name: 'middleman', value: record.mmId ? `<@${record.mmId}>` : '—', inline: true },
      { name: 'trader 1 review', value: reviewBlock(record, record.requesterId).slice(0, 1024) },
      { name: 'trader 2 review', value: reviewBlock(record, record.partnerId).slice(0, 1024) }
    )
    .setFooter({ text: 'Verified middleman trade - logged by this bot' })
    .setTimestamp(new Date(record.createdAt));

  const withImage = [record.requesterId, record.partnerId]
    .map((id) => record.reviews?.[id]?.image)
    .find(Boolean);
  if (withImage) embed.setImage(withImage);
  return embed;
}

function reviewRow(record) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vch:review:${record.id}`)
      .setLabel('Add your review')
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Primary)
  );
}

// ---------- posting ----------

// Called when a trade reaches stage "done".
async function postTradeVouch(guild, trade, channelIdOverride) {
  const channelId = channelIdOverride ?? getVouchChannelId(trade.guildId);
  if (!channelId || !trade.channelId) {
    if (!trade.channelId) console.error('Auto vouch skipped: trade has no channelId');
    return null;
  }

  const channel = guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel?.isTextBased()) return null;

  const record = {
    id: trade.channelId,
    guildId: trade.guildId,
    channelId,
    messageId: null,
    requesterId: trade.requesterId,
    partnerId: trade.partnerId,
    mmId: trade.mmId ?? null,
    give: trade.give ?? null,
    get: trade.get ?? null,
    reviews: {},
    createdAt: new Date().toISOString(),
  };

  const msg = await channel
    .send({
      embeds: [buildVouchEmbed(record)],
      components: [reviewRow(record)],
      allowedMentions: { parse: [] },
    })
    .catch(() => null);

  if (!msg) return null;
  record.messageId = msg.id;
  saveRecord(record);
  return msg;
}

// ---------- reviews ----------

function reviewModal(recordId) {
  return new ModalBuilder()
    .setCustomId(`vch:modal:${recordId}`)
    .setTitle('Add your review')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rating')
          .setLabel('Rating 1-5')
          .setStyle(TextInputStyle.Short)
          .setMinLength(1)
          .setMaxLength(1)
          .setPlaceholder('5')
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('comment')
          .setLabel('Your review')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(400)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('image')
          .setLabel('Proof image URL (optional)')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(400)
          .setRequired(false)
      )
    );
}

async function handleReviewButton(interaction) {
  const recordId = interaction.customId.split(':')[2];
  const record = getRecord(recordId);
  if (!record) {
    return interaction.reply({ content: 'This vouch is no longer available.', ephemeral: true });
  }
  if (![record.requesterId, record.partnerId].includes(interaction.user.id)) {
    return interaction.reply({ content: 'Only the two traders in this trade can review it.', ephemeral: true });
  }
  if (record.reviews?.[interaction.user.id]) {
    return interaction.reply({ content: 'You already reviewed this trade.', ephemeral: true });
  }
  return interaction.showModal(reviewModal(recordId));
}

async function handleReviewModal(interaction) {
  const recordId = interaction.customId.split(':')[2];
  const record = getRecord(recordId);
  if (!record) {
    return interaction.reply({ content: 'This vouch is no longer available.', ephemeral: true });
  }
  if (![record.requesterId, record.partnerId].includes(interaction.user.id)) {
    return interaction.reply({ content: 'Only the two traders in this trade can review it.', ephemeral: true });
  }

  const rawRating = Number(interaction.fields.getTextInputValue('rating').trim());
  if (!Number.isInteger(rawRating) || rawRating < 1 || rawRating > 5) {
    return interaction.reply({ content: 'Rating must be a whole number from 1 to 5.', ephemeral: true });
  }

  const image = interaction.fields.getTextInputValue('image').trim();
  if (image && !/^https?:\/\//i.test(image)) {
    return interaction.reply({ content: 'The proof image must be a http(s) URL.', ephemeral: true });
  }

  record.reviews[interaction.user.id] = {
    rating: rawRating,
    comment: interaction.fields.getTextInputValue('comment').trim().slice(0, 400),
    image: image || null,
    at: new Date().toISOString(),
  };
  saveRecord(record);

  // keep the reputation store in sync so /vouches counts it
  const vouches = load('vouches');
  const key = `${record.guildId}:${record.mmId ?? record.partnerId}`;
  vouches[key] = vouches[key] ?? {};
  vouches[key][interaction.user.id] = {
    comment: record.reviews[interaction.user.id].comment,
    at: record.reviews[interaction.user.id].at,
    rating: rawRating,
    trade: `${record.give ?? 'items'} ↔ ${record.get ?? 'items'}`,
  };
  save('vouches', vouches);

  const channel = interaction.guild.channels.cache.get(record.channelId);
  const message = channel
    ? await channel.messages.fetch(record.messageId).catch(() => null)
    : null;

  if (message) {
    await message
      .edit({ embeds: [buildVouchEmbed(record)], components: [reviewRow(record)] })
      .catch(() => {});
  }

  return interaction.reply({ content: `✅ Thanks - your ${rawRating}★ review is on the vouch.`, ephemeral: true });
}

module.exports = {
  getVouchChannelId,
  setVouchChannelId,
  getRecord,
  saveRecord,
  buildVouchEmbed,
  reviewRow,
  postTradeVouch,
  handleReviewButton,
  handleReviewModal,
  reviewModal,
  stars,
};
