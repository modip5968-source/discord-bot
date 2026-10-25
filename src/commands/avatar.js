const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Show a member's avatar")
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member (defaults to you)')
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('member') ?? interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s avatar`)
      .setImage(user.displayAvatarURL({ size: 512 }))
      .setColor(0x5865f2);
    await interaction.reply({ embeds: [embed] });
  },
};
