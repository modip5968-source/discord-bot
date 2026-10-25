const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { openTicket } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-open')
    .setDescription('Open a private ticket channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = await openTicket(interaction.guild, interaction.user);
      await interaction.editReply(`🎫 Ticket opened: ${channel}`);
    } catch (err) {
      console.error('Error opening ticket:', err);
      await interaction.editReply('I could not open a ticket (missing permissions or channel limit reached).');
    }
  },
};
