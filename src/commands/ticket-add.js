const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isTicketChannel } = require('../tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('Add a member to this ticket')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member to add').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('member');

    if (!isTicketChannel(interaction.channel)) {
      return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    }
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }

    await interaction.channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    await interaction.reply(`➕ Added ${member} to the ticket.`);
  },
};
