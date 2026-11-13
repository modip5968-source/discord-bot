const { SlashCommandBuilder } = require('discord.js');
const { startTrade } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('middleman')
    .setDescription('Open a middleman ticket with a trade partner')
    .addUserOption((o) => o.setName('partner').setDescription('The person you are trading with').setRequired(true))
    .setDMPermission(false),
  async execute(interaction) {
    const partner = interaction.options.getMember('partner');
    if (!partner) {
      return interaction.reply({ content: 'Could not find that member in this server.', ephemeral: true });
    }
    await startTrade(interaction, partner);
  },
};
