const { SlashCommandBuilder } = require('discord.js');

const ANSWERS = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes, definitely.',
  'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', "Don't count on it.", 'My reply is no.',
  'My sources say no.', 'Outlook not so good.', 'Very doubtful.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eightball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption((opt) =>
      opt.setName('question').setDescription('Your question').setRequired(true)
    ),
  async execute(interaction) {
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    await interaction.reply(`🎱 **Q:** ${interaction.options.getString('question')}\n**A:** ${answer}`);
  },
};
