const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { startTrade } = require('../middleman');

function infoEmbed() {
  return new EmbedBuilder()
    .setTitle('❓ WHAT IS A MIDDLEMAN !?')
    .setColor(0x5865f2)
    .setDescription(
      [
        '**1.** Middleman (MM) is a trusted third party who securely holds the payment until the seller delivers the agreed goods or services.',
        '',
        '**2.** The payment is released to the seller only after the buyer confirms that everything has been delivered as agreed.',
        '',
        '**3.** This process helps prevent scams, build trust, and ensure fair transactions between both parties.',
        '',
        '**4.** Commonly used for high-value game trades, real-money transactions, in-game currencies, rare items, and collectibles.',
        '',
        '**5.** For maximum safety, always use a reputable and verified middleman approved by both parties.',
      ].join('\n')
    )
    .setFooter({ text: "Never send items to someone who DM'd you first - open a ticket instead." });
}

function infoRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mmi:understood')
      .setLabel('UNDERSTOOD')
      .setEmoji('☑️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('mmi:confused')
      .setLabel('CONFUSED')
      .setEmoji('❔')
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm')
    .setDescription('What a middleman is - or open a middleman ticket with a partner')
    .addUserOption((o) => o.setName('partner').setDescription('Trading with someone? Opens a ticket with them'))
    .setDMPermission(false),

  async execute(interaction) {
    const partner = interaction.options.getMember('partner');

    // no partner given: explain what an MM is
    if (!partner) {
      return interaction.reply({ embeds: [infoEmbed()], components: [infoRow()] });
    }

    // partner given: unchanged trade flow
    return startTrade(interaction, partner);
  },

  infoEmbed,
  infoRow,

  async handleButton(interaction) {
    const id = interaction.customId;

    if (id === 'mmi:understood') {
      return interaction.reply({
        content: [
          '✅ Great. To trade safely:',
          '• `/mm @partner` opens a private ticket',
          '• Both sides confirm the terms',
          '• Send your items **only** to the middleman who claims the ticket',
          '• Press **I Received My Items** when you have yours',
        ].join('\n'),
        ephemeral: true,
      });
    }

    if (id === 'mmi:confused') {
      return interaction.reply({
        content: [
          '❔ No problem - short version:',
          'A middleman holds both sides of the trade so neither person can run off with the other\'s items. You only get your stuff released once both sides confirm.',
          '',
          'Open a ticket with `/mm @partner` (or the ticket panel) and a middleman will walk you through each step.',
          'Full guide: `/mm-guide`',
        ].join('\n'),
        ephemeral: true,
      });
    }
  },
};
