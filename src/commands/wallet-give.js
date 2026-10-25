const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wallet-give')
    .setDescription('Give coins to a member (staff)')
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1).setMaxValue(1000000000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');
    const amount = interaction.options.getInteger('amount');
    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });

    const data = load('wallet');
    const guildWallet = data[interaction.guildId] ?? (data[interaction.guildId] = {});
    guildWallet[member.id] = (guildWallet[member.id] ?? 0) + amount;
    save('wallet', data);

    await interaction.reply(`💰 Gave **${amount}** coins to ${member}. New balance: **${guildWallet[member.id]}**.`);
  },
};
