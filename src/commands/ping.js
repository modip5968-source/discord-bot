const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check the bot's latency"),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `🏓 Pong! Roundtrip: **${roundtrip}ms** | API: **${interaction.client.ws.ping}ms**`
    );
  },
};
