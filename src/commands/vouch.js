const { SlashCommandBuilder } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Leave a vouch for a seller you bought from')
    .addUserOption((o) => o.setName('member').setDescription('The seller').setRequired(true))
    .addStringOption((o) => o.setName('comment').setDescription('Your feedback'))
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');
    const comment = interaction.options.getString('comment') ?? 'Trusted seller!';

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (member.id === interaction.user.id) {
      return interaction.reply({ content: "You can't vouch for yourself 😄", ephemeral: true });
    }
    if (member.user.bot) {
      return interaction.reply({ content: "Bots don't need vouches.", ephemeral: true });
    }

    const data = load('vouches');
    const key = `${interaction.guildId}:${member.id}`;
    const sellerVouches = data[key] ?? (data[key] = {});
    sellerVouches[interaction.user.id] = { comment, at: new Date().toISOString() };
    save('vouches', data);

    const count = Object.keys(sellerVouches).length;
    await interaction.reply(
      `⭐ **${member.user.tag}** received a vouch from ${interaction.user}! They now have **${count} vouch${count === 1 ? '' : 'es'}**.`
    );
  },
};
