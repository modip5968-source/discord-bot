const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const TICKET_TOPIC_PREFIX = 'Ticket opened by';
const TICKET_CHANNEL_PREFIX = 'ticket-';

function isTicketChannel(channel) {
  return Boolean(
    channel &&
    channel.guild &&
    channel.type === ChannelType.GuildText &&
    channel.topic &&
    channel.topic.startsWith(TICKET_TOPIC_PREFIX)
  );
}

function getTicketOpenerId(channel) {
  if (!isTicketChannel(channel)) return null;
  return channel.topic.slice(TICKET_TOPIC_PREFIX.length).trim() || null;
}

async function getTicketCategory(guild) {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets'
  );
  if (existing) return existing;

  return guild.channels.create({
    name: 'Tickets',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });
}

function welcomeComponents() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );
}

async function openTicket(guild, user) {
  const category = await getTicketCategory(guild);

  const base = (TICKET_CHANNEL_PREFIX + user.username)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 90) || `${TICKET_CHANNEL_PREFIX}user`;
  let name = base;
  let attempt = 1;
  while (
    guild.channels.cache.some(
      (c) => c.name === name && c.parentId === category.id
    ) &&
    attempt < 50
  ) {
    name = `${base}-${attempt++}`;
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `${TICKET_TOPIC_PREFIX} ${user.id}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle('🎫 Ticket')
    .setDescription(
      `Hey ${user}, welcome to your ticket!\nA staff member will be with you shortly. Describe your issue here.`
    )
    .setColor(0x5865f2)
    .setTimestamp();

  await channel.send({
    content: `<@${user.id}>`,
    embeds: [embed],
    components: [welcomeComponents()],
  });

  return channel;
}

async function closeTicket(channel, closedBy) {
  await channel.send(
    `🔒 Ticket closed by <@${closedBy.id}>. This channel will be deleted in 5 seconds.`
  );
  setTimeout(() => {
    channel.delete(`Ticket closed by ${closedBy.tag}`).catch(() => {});
  }, 5000);
}

module.exports = {
  TICKET_TOPIC_PREFIX,
  TICKET_CHANNEL_PREFIX,
  isTicketChannel,
  getTicketOpenerId,
  openTicket,
  closeTicket,
  welcomeComponents,
};
