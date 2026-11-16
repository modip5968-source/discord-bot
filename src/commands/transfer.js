const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isTicketChannel, getTicketOpenerId } = require('../tickets');
const { getTrade, getConfig, updateTrade, tradeEmbed } = require('../middleman');
const { load, save } = require('../store');

// channelId -> userId who currently handles a plain support ticket
function claims() {
  return load('ticket-claims');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Transfer this ticket to another staff member')
    .addUserOption((o) => o.setName('user').setDescription('Who takes over the ticket').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const channel = interaction.channel;

    if (!target) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You already have this ticket.', ephemeral: true });
    }

    // Middleman trade ticket: hand the claim to another middleman
    const trade = getTrade(channel.id);
    if (trade) {
      const cfg = getConfig(trade.guildId);
      const isMm = cfg?.mmRoleId && interaction.member.roles.cache.has(cfg.mmRoleId);
      const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);

      if (!isMm && !isAdmin) {
        return interaction.reply({ content: 'Only a middleman or an admin can transfer a trade ticket.', ephemeral: true });
      }
      if (target.id === trade.requesterId || target.id === trade.partnerId) {
        return interaction.reply({ content: 'You cannot transfer a trade to one of the two traders.', ephemeral: true });
      }
      if (!['claim', 'escrow'].includes(trade.stage)) {
        return interaction.reply({ content: `This trade is in stage **${trade.stage}**, it cannot be transferred now.`, ephemeral: true });
      }

      await channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      const updated = updateTrade(channel.id, { mmId: target.id, stage: 'escrow' });
      await interaction.reply({
        content: `🔁 Trade transferred from ${interaction.user} to ${target}.`,
        embeds: [tradeEmbed(updated)],
      });
      return;
    }

    // Plain support ticket
    if (!isTicketChannel(channel)) {
      return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    }

    await channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    const data = claims();
    data[channel.id] = target.id;
    save('ticket-claims', data);

    const openerId = getTicketOpenerId(channel);
    await interaction.reply(
      `🔁 Ticket transferred to ${target}.${openerId ? ` Opened by <@${openerId}>.` : ''}`
    );
  },
};
