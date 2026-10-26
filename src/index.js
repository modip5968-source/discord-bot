const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
require('dotenv').config();
const { openTicket, closeTicket, isTicketChannel, getTicketOpenerId, welcomeComponents } = require('./tickets');
const { handlePrefixCommand } = require('./prefix');
const { load } = require('./store');
const { addXp } = require('./levels');
const { resumeAll, getGiveaway, putGiveaway, reroll, buildEmbed } = require('./giveaways');
const { enforceAll, checkJoin } = require('./guild-guard');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// In-memory AFK store (resets on restart)
client.afkUsers = new Collection();

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// Register slash commands on startup (global commands can take up to 1h to appear the first time)
client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const body = [...client.commands.values()].map((cmd) => cmd.data.toJSON());
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body });
    console.log(`Registered ${body.length} slash commands`);
  } catch (err) {
    console.error('Command registration failed:', err);
  }

  // Resume unfinished giveaways (survives restarts)
  resumeAll(c);

  // Leave any server not on the allowlist
  const left = await enforceAll(c);
  if (left > 0) console.log(`Guild guard: left ${left} unauthorized server(s)`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    try {
      await handleButton(interaction);
    } catch (err) {
      console.error('Error in button handler:', err);
      if (!interaction.replied) {
        await interaction
          .reply({ content: 'Something went wrong handling that button.', ephemeral: true })
          .catch(() => {});
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const reply = { content: 'Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

async function handleButton(interaction) {
  const { customId } = interaction;

  // Giveaway buttons: gw:<id>:join / gw:<id>:reroll
  if (customId.startsWith('gw:')) {
    const [, gwId, action] = customId.split(':');
    const gw = getGiveaway(gwId);

    if (action === 'join') {
      if (!gw) return interaction.reply({ content: 'This giveaway no longer exists.', ephemeral: true });
      if (gw.ended) return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
      if (gw.guildId !== interaction.guildId) return interaction.deferUpdate();

      const idx = gw.participants.indexOf(interaction.user.id);
      const joined = idx === -1;
      if (joined) gw.participants.push(interaction.user.id);
      else gw.participants.splice(idx, 1);
      putGiveaway(gw);

      try {
        const message = await interaction.channel.messages.fetch(gw.messageId);
        await message.edit({
          embeds: [buildEmbed(gw)],
        });
      } catch {
        // message gone
      }
      return interaction.reply({
        content: joined ? '🎉 You entered the giveaway!' : 'You left the giveaway.',
        ephemeral: true,
      });
    }

    if (action === 'reroll') {
      if (!interaction.member.permissions.has('ManageGuild')) {
        return interaction.reply({ content: 'Only staff can reroll.', ephemeral: true });
      }
      if (!gw || !gw.ended) return interaction.reply({ content: 'This giveaway has not ended yet.', ephemeral: true });
      await reroll(interaction.client, gwId);
      return interaction.reply({ content: '🔄 Rerolled!', ephemeral: true });
    }
    return;
  }

  if (customId === 'ticket_open') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const channel = await openTicket(interaction.guild, interaction.user);
      await interaction.editReply(`🎫 Ticket opened: ${channel}`);
    } catch (err) {
      console.error('Error opening ticket:', err);
      await interaction.editReply('I could not open a ticket (missing permissions or channel limit reached).');
    }
    return;
  }

  if (customId === 'ticket_close') {
    if (!isTicketChannel(interaction.channel)) return;
    const openerId = getTicketOpenerId(interaction.channel);
    const canClose =
      interaction.member.permissions.has('ManageChannels') ||
      interaction.user.id === openerId;

    if (!canClose) {
      return interaction.reply({ content: 'Only staff or the ticket opener can close this ticket.', ephemeral: true });
    }

    await interaction.update({
      content: `⚠️ <@${interaction.user.id}> wants to close this ticket. Close it?`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_close_confirm')
            .setLabel('✅ Confirm Close')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('ticket_close_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
    });
    return;
  }

  if (customId === 'ticket_close_confirm') {
    await interaction.update({ content: '🔒 Closing ticket...', components: [] });
    await closeTicket(interaction.channel, interaction.user);
    return;
  }

  if (customId === 'ticket_close_cancel') {
    await interaction.update({
      content: '❌ Close cancelled.',
      components: [welcomeComponents()],
    });
    return;
  }
}

// Instantly leave servers that aren't on the allowlist
client.on(Events.GuildCreate, (guild) => {
  checkJoin(guild).catch((e) => console.error('Guild guard failed:', e));
});

// Welcome message + auto-role on join
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const cfg = load('guild-config')[member.guild.id] ?? {};

    if (cfg.autoroleId) {
      await member.roles.add(cfg.autoroleId).catch(() => {});
    }
    if (cfg.welcomeChannelId) {
      const channel = member.guild.channels.cache.get(cfg.welcomeChannelId);
      if (channel && channel.isTextBased()) {
        const text = (cfg.welcomeMessage ?? 'Welcome {user} to **{server}**! 🎉')
          .replaceAll('{user}', member.toString())
          .replaceAll('{username}', member.user.username)
          .replaceAll('{server}', member.guild.name);
        await channel.send(text).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Welcome/autorole failed:', err);
  }
});

// Prefix commands ($ping, $kick @user spam, ...) + XP + AFK handling
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  // XP (level-up announcement)
  try {
    const result = await addXp(message);
    if (result?.leveledUp) {
      await message.channel
        .send(`🎉 ${message.author} leveled up to **level ${result.level}**!`)
        .catch(() => {});
    }
  } catch {
    // XP should never break chat
  }

  if (await handlePrefixCommand(message, client.commands)) return;

  const afk = client.afkUsers;

  // Clear AFK when the AFK user sends a message
  if (afk.has(message.author.id)) {
    afk.delete(message.author.id);
    const notif = await message.channel
      .send(`👋 Welcome back, <@${message.author.id}>! Your AFK status was cleared.`)
      .catch(() => null);
    if (notif) setTimeout(() => notif.delete().catch(() => {}), 10000);
    return;
  }

  // Reply when someone mentions an AFK user
  const mentioned = message.mentions.users.filter(
    (u) => !u.bot && u.id !== message.author.id && afk.has(u.id)
  );
  if (mentioned.size === 0) return;

  const lines = mentioned.map((u) => {
    const entry = afk.get(u.id);
    const mins = Math.floor((Date.now() - entry.since) / 60000);
    return `💤 <@${u.id}> is AFK: **${entry.reason}** (${mins < 1 ? 'less than a minute' : `${mins} min ago`})`;
  });

  const notif = await message.channel.send(lines.join('\n')).catch(() => null);
  if (notif) setTimeout(() => notif.delete().catch(() => {}), 15000);
});

client.login(process.env.DISCORD_TOKEN);
