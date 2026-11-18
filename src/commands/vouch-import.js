const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { load, save } = require('../store');

const PENDING = 'vouch-import-pending';
const MENTION_RE = /^<@!?(\d{17,20})>$/;
const ID_RE = /^\d{17,20}$/;

function parseUserId(raw, fallback) {
  const s = String(raw ?? '').trim();
  if (!s) return fallback ?? null;
  const m = s.match(MENTION_RE);
  if (m) return m[1];
  if (ID_RE.test(s)) return s;
  return null;
}

function stars(n) {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  return '⭐'.repeat(v) + '☆'.repeat(5 - v);
}

module.exports = {
  parseUserId,
  stars,
  data: new SlashCommandBuilder()
    .setName('vouch-import')
    .setDescription('Import a real vouch from before this bot (proof required)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('vimp:modal')
      .setTitle('Import an old vouch')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('to').setLabel('Vouched person (mention or ID)')
            .setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('from').setLabel('Given by (mention or ID, blank = you)')
            .setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('star').setLabel('Rating 1-5')
            .setStyle(TextInputStyle.Short).setMinLength(1).setMaxLength(1).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('feedback').setLabel('What they said')
            .setStyle(TextInputStyle.Paragraph).setMaxLength(400).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('proof')
            .setLabel('Date + proof link (e.g. 2026-09-14 https://...)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(600)
            .setPlaceholder('2026-09-14 https://cdn.discordapp.com/attachments/...')
            .setRequired(true)
        )
      );

    // stash who opened it so the modal submit can default "from" to them
    const d = load(PENDING);
    d[interaction.user.id] = { guildId: interaction.guildId, at: Date.now() };
    save(PENDING, d);

    return interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const guildId = interaction.guildId;
    const toId = parseUserId(interaction.fields.getTextInputValue('to'));
    const fromId = parseUserId(interaction.fields.getTextInputValue('from'), interaction.user.id);
    const rating = Number(interaction.fields.getTextInputValue('star').trim());
    const feedback = interaction.fields.getTextInputValue('feedback').trim();
    const proofRaw = interaction.fields.getTextInputValue('proof').trim();

    if (!toId) return interaction.reply({ content: 'I need a valid mention or user ID for the person being vouched.', ephemeral: true });
    if (!fromId) return interaction.reply({ content: 'I need a valid mention or user ID for the person who vouched.', ephemeral: true });
    if (toId === fromId) return interaction.reply({ content: 'The two people must be different.', ephemeral: true });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return interaction.reply({ content: 'Rating must be a whole number 1-5.', ephemeral: true });
    }

    // proof: needs a link, and the date if given must be parseable
    const link = (proofRaw.match(/https?:\/\/\S+/) ?? [])[0] ?? null;
    if (!link) {
      return interaction.reply({ content: 'Old vouches need a proof link (screenshot URL) so the import stays verifiable.', ephemeral: true });
    }
    const dateMatch = proofRaw.match(/\d{4}-\d{2}-\d{2}/);
    const when = dateMatch ? new Date(`${dateMatch[0]}T12:00:00Z`) : new Date();
    if (Number.isNaN(when.getTime())) {
      return interaction.reply({ content: 'That date could not be read - use YYYY-MM-DD.', ephemeral: true });
    }

    const data = load('vouches');
    const key = `${guildId}:${toId}`;
    data[key] = data[key] ?? {};
    data[key][fromId] = {
      comment: feedback,
      at: when.toISOString(),
      rating,
      imported: true,
      proof: link,
      by: interaction.user.id,
    };
    save('vouches', data);

    const total = Object.keys(data[key]).length;
    const imported = Object.values(data[key]).filter((v) => v.imported).length;

    const embed = new EmbedBuilder()
      .setTitle('📥 Old vouch imported')
      .setColor(0x99aab5)
      .setDescription(
        [
          `**${toId ? `<@${toId}>` : 'user'}** now has **${total} vouch${total === 1 ? '' : 'es'}** (${imported} imported).`,
          '',
          `**from:** <@${fromId}>`,
          `**rating:** ${stars(rating)}`,
          `**feedback:** ${feedback}`,
          `**trade date:** <t:${Math.floor(when.getTime() / 1000)}:D>`,
          `**proof:** ${link}`,
        ].join('\n')
      )
      .setFooter({ text: `Imported by ${interaction.user.tag} - shown as imported, never mixed with live trades` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
