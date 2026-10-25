const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption((opt) =>
      opt.setName('question').setDescription('The poll question').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('option1').setDescription('First option').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('option2').setDescription('Second option').setRequired(true)
    )
    .addStringOption((opt) => opt.setName('option3').setDescription('Third option'))
    .addStringOption((opt) => opt.setName('option4').setDescription('Fourth option')),
  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = [1, 2, 3, 4]
      .map((n) => interaction.options.getString(`option${n}`))
      .filter(Boolean);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setColor(0x5865f2)
      .setDescription(
        options.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join('\n')
      )
      .setFooter({ text: `Poll by ${interaction.user.tag}` });

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < options.length; i++) {
      await message.react(NUMBER_EMOJIS[i]);
    }
  },
};
