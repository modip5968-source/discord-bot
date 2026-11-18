const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ApplicationCommandOptionType,
} = require('discord.js');
const { load, save } = require('../store');
const autoVouch = require('../vouches');

function stars(n) {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  return '⭐'.repeat(v) + '☆'.repeat(5 - v);
}

// Accept either an attachment option (slash) or an image on the message (prefix)
function resolveImage(interaction) {
  const attachment = interaction.options.getAttachment?.('image');
  if (attachment && /^image\//i.test(attachment.contentType ?? '')) return attachment.url;

  const raw = interaction.options.getString?.('image_url');
  if (raw && /^https?:\/\//i.test(raw)) return raw;

  const fromMessage = interaction.message?.attachments?.find((a) =>
    /^image\//i.test(a.contentType ?? '')
  );
  return fromMessage?.url ?? null;
}

module.exports = {
  stars,
  data: new SlashCommandBuilder()
    .setName('auto-vouch')
    .setDescription('Post a vouch embed for a completed trade')
    .addUserOption((o) => o.setName('to').setDescription('Who is getting the vouch').setRequired(true))
    .addIntegerOption((o) =>
      o.setName('star').setDescription('Rating 1-5').setRequired(true).setMinValue(1).setMaxValue(5)
    )
    .addStringOption((o) => o.setName('feedback').setDescription('What they said about the trade').setRequired(true))
    .addStringOption((o) => o.setName('info').setDescription('Trade info, e.g. Game Account ↔ Crypto'))
    .addAttachmentOption((o) => o.setName('image').setDescription('Proof screenshot'))
    .addStringOption((o) => o.setName('image_url').setDescription('Proof image link instead of a file'))
    .addUserOption((o) =>
      o.setName('from').setDescription('Who is giving the vouch (defaults to you)')
    )
    .setDMPermission(false),

  async execute(interaction) {
    const to = interaction.options.getUser('to');
    const rating = interaction.options.getInteger('star');
    const feedback = interaction.options.getString('feedback');
    const info = interaction.options.getString('info');
    const fromUser = interaction.options.getUser('from') ?? interaction.user;
    const image = resolveImage(interaction);

    if (to.bot) {
      return interaction.reply({ content: "Bots don't need vouches.", ephemeral: true });
    }
    if (to.id === fromUser.id) {
      return interaction.reply({ content: 'A vouch needs two different people.', ephemeral: true });
    }

    // Writing a vouch on someone else's behalf is staff-only and always disclosed.
    const staffLogged = fromUser.id !== interaction.user.id;
    if (staffLogged && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: 'You can only post vouches in your own name. Ask staff to log one on behalf of someone else.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ New Vouch')
      .setColor(0x57f287)
      .addFields(
        { name: 'TO', value: `<@${to.id}>`, inline: true },
        { name: 'FROM', value: `<@${fromUser.id}>`, inline: true },
        { name: 'STAR', value: stars(rating), inline: true }
      );

    if (info) embed.addFields({ name: 'TRADE INFO', value: info.slice(0, 1024) });
    embed.addFields({ name: 'FEEDBACK', value: feedback.slice(0, 1024) });

    if (image) embed.setImage(image);
    embed.setTimestamp();

    if (staffLogged) {
      embed.setFooter({ text: `Logged by ${interaction.user.tag} on behalf of ${fromUser.tag}` });
    }

    // post into the configured vouch channel, falling back to the current one
    const targetId = autoVouch.getVouchChannelId(interaction.guildId);
    const target =
      targetId && targetId !== interaction.channelId
        ? interaction.guild?.channels?.cache?.get(targetId) ??
          (await interaction.guild?.channels?.fetch?.(targetId).catch(() => null))
        : null;

    if (!target || target.id === interaction.channelId) {
      await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    } else {
      const sent = await target
        .send({ embeds: [embed], allowedMentions: { parse: [] } })
        .catch(() => null);
      if (!sent) {
        return interaction.reply({
          content: `I could not post in ${target} - check my Send Messages and Embed Links permissions there.`,
          ephemeral: true,
        });
      }
      await interaction.reply({ content: `✅ Vouch posted in ${target}.`, ephemeral: true });
    }

    // count toward reputation
    try {
      const vouches = load('vouches');
      const key = `${interaction.guildId}:${to.id}`;
      vouches[key] = vouches[key] ?? {};
      vouches[key][fromUser.id] = {
        comment: feedback.slice(0, 400),
        at: new Date().toISOString(),
        rating,
        trade: info ?? null,
        by: interaction.user.id,
      };
      save('vouches', vouches);
    } catch (err) {
      console.error('Vouch reputation save failed:', err);
    }
  },
};

module.exports.ApplicationCommandOptionType = ApplicationCommandOptionType;
