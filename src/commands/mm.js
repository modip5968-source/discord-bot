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
    .setImage('https://media.base44.com/images/public/6addbd16bdd958d4ca47e74e/3c9eecd47_mm-diagram.jpg')
    .setFooter({ text: "Never send items to someone who DM'd you first - open a ticket instead." });
}

function infoRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mmi:understood')
      .setLabel('UNDERSTOOD')
      .setEmoji({ id: '1571803686101852192', name: 'verify', animated: true })
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('mmi:confused')
      .setLabel('CONFUSED')
      .setEmoji({ id: '1571910842260136027', name: 'warning', animated: true })
      .setStyle(ButtonStyle.Danger)
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
    const mention = interaction.user;

    if (interaction.customId === 'mmi:understood') {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(`**${mention} has understood !!**`);
      return interaction.reply({
        embeds: [embed],
        allowedMentions: { users: [interaction.user.id] },
      });
    }

    if (interaction.customId === 'mmi:confused') {
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setDescription(`**${mention} is still confused don't worry staff will help you !!**`);
      return interaction.reply({
        embeds: [embed],
        allowedMentions: { users: [interaction.user.id] },
      });
    }

  },
};
