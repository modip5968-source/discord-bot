const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice, e.g. 2d6')
    .addStringOption((opt) =>
      opt
        .setName('dice')
        .setDescription('Dice to roll (e.g. 2d6)')
        .setRequired(true)
    ),
  async execute(interaction) {
    const match = /^(\d{1,3})d(\d{1,4})$/i.exec(interaction.options.getString('dice'));
    if (!match) {
      return interaction.reply({ content: 'Use the format `NdN`, e.g. `2d6`.', ephemeral: true });
    }
    const count = Math.min(parseInt(match[1], 10), 100);
    const sides = parseInt(match[2], 10);

    if (sides < 2) {
      return interaction.reply({ content: 'Dice need at least 2 sides.', ephemeral: true });
    }

    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    await interaction.reply(
      `🎲 **${total}** (${rolls.join(', ')}) on ${count}d${sides}`
    );
  },
};
