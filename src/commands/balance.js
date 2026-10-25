const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check your or a member's wallet balance")
    .addUserOption((o) => o.setName('member').setDescription('Member (defaults to you)'))
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member') ?? interaction.member;
    const amount = load('wallet')[interaction.guildId]?.[member.id] ?? 0;

    const embed = new EmbedBuilder()
      .setTitle(`💰 ${member.user.username}'s balance`)
      .setColor(0xfee75c)
      .setDescription(`**${amount}** coins`);
    await interaction.reply({ embeds: [embed] });
  },
};
