const { SlashCommandBuilder } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins from your wallet to another member')
    .addUserOption((o) => o.setName('member').setDescription('Who to pay').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1).setMaxValue(1000000000))
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');
    const amount = interaction.options.getInteger('amount');
    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: "You can't pay yourself.", ephemeral: true });
    if (member.user.bot) return interaction.reply({ content: "Bots don't have wallets.", ephemeral: true });

    const data = load('wallet');
    const guildWallet = data[interaction.guildId] ?? (data[interaction.guildId] = {});
    const from = guildWallet[interaction.user.id] ?? 0;
    if (from < amount) {
      return interaction.reply({ content: `You only have **${from}** coins.`, ephemeral: true });
    }

    guildWallet[interaction.user.id] = from - amount;
    guildWallet[member.id] = (guildWallet[member.id] ?? 0) + amount;
    save('wallet', data);

    await interaction.reply(`💸 ${interaction.user} paid ${member} **${amount}** coins.`);
  },
};
