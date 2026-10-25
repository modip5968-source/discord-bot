const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Commands')
      // Slash commands: /name — prefix commands: $name
      .setColor(0x5865f2)
      .setDescription(
        [...interaction.client.commands.values()]
          .map((cmd) => `**/${cmd.data.name}** (or $${cmd.data.name}) — ${cmd.data.description}`)
          .join('\n')
      );
    await interaction.reply({ embeds: [embed] });
  },
};
