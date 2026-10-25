const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isTicketChannel, closeTicket } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Close this ticket (deletes the channel)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    if (!isTicketChannel(interaction.channel)) {
      return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    }

    await interaction.reply('🔒 Closing this ticket...');
    await closeTicket(interaction.channel, interaction.user);
  },
};
