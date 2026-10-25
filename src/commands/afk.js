const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set yourself as AFK (auto-clears when you send a message)')
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Why you are AFK (defaults to just AFK)')
    ),
  async execute(interaction) {
    const reason = interaction.options.getString('reason') ?? 'AFK';

    interaction.client.afkUsers.set(interaction.user.id, {
      reason,
      since: Date.now(),
      tag: interaction.user.tag,
    });

    await interaction.reply(`💤 **${interaction.user.username}** is now AFK: ${reason}`);
  },
};
