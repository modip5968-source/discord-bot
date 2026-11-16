const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xd')
    .setDescription('Check the bot\'s latency'),
  async execute(interaction) {
    // Works as /xd and as $xd (the prefix shim supplies the same interface)
    const user = interaction.user ?? interaction.member?.user;
    const mention = user ? `${user}` : 'someone';

    await interaction.reply({
      content: `who tf woke me up 😡 ${mention} who used this command · 🏓 ${Math.round(interaction.client.ws.ping)}ms`,
      allowedMentions: { users: user ? [user.id] : [] },
    });
  },
};
