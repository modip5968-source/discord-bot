const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-fee')
    .setDescription('Work out the middleman fee for a trade amount')
    .addNumberOption((o) => o.setName('amount').setDescription('Trade value').setRequired(true).setMinValue(1))
    .addNumberOption((o) => o.setName('percent').setDescription('Fee percent (default 5)').setMinValue(0).setMaxValue(50)),
  async execute(interaction) {
    const amount = interaction.options.getNumber('amount');
    const pct = interaction.options.getNumber('percent') ?? 5;

    const fee = Math.round(amount * pct) / 100;
    const payout = Math.round((amount - fee) * 100) / 100;

    const embed = new EmbedBuilder()
      .setTitle('🧾 Middleman fee')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Trade value', value: `${amount}`, inline: true },
        { name: 'Fee', value: `${pct}% → **${fee}**`, inline: true },
        { name: 'Seller receives', value: `**${payout}**`, inline: true }
      )
      .setFooter({ text: 'Agree the fee in the ticket before anyone sends items.' });

    await interaction.reply({ embeds: [embed] });
  },
};
