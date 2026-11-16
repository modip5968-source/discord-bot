// Custom slash commands: /command create builds a command with an embed and optional buttons.
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
} = require('discord.js');
const { load, save } = require('./store');
const { openTicket } = require('./tickets');

const STORE = 'custom-commands';
const RESERVED = ['command', 'help', 'mm-setup', 'middleman'];

// ---------- storage ----------

function all() {
  const d = load(STORE);
  return d && typeof d === 'object' ? d : {};
}

function forGuild(guildId) {
  return all()[guildId] ?? {};
}

function get(guildId, name) {
  return forGuild(guildId)[String(name).toLowerCase()] ?? null;
}

function put(guildId, name, def) {
  const d = all();
  d[guildId] = d[guildId] ?? {};
  d[guildId][String(name).toLowerCase()] = def;
  save(STORE, d);
  return def;
}

function remove(guildId, name) {
  const d = all();
  const key = String(name).toLowerCase();
  if (!d[guildId]?.[key]) return false;
  delete d[guildId][key];
  save(STORE, d);
  return true;
}

// ---------- button parsing ----------
// One per line:  Label | action
// actions: text: <message> | role: <name or id> | unrole: <name or id> | ticket | link: <url>
const ACTIONS = ['text', 'role', 'unrole', 'ticket', 'link'];

function parseButtons(text) {
  const out = [];
  const errors = [];
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const idx = line.lastIndexOf('|');
    if (idx === -1) {
      errors.push(`"${line}" needs a | between the label and the action`);
      continue;
    }
    const label = line.slice(0, idx).trim().slice(0, 80);
    const raw = line.slice(idx + 1).trim();
    const m = raw.match(/^([a-z]+)\s*:?\s*(.*)$/i);
    const kind = (m?.[1] ?? '').toLowerCase();
    const value = (m?.[2] ?? '').trim();

    if (!label) {
      errors.push(`a button is missing its label`);
      continue;
    }
    if (!ACTIONS.includes(kind)) {
      errors.push(`"${label}" has an unknown action "${kind}" (use ${ACTIONS.join(', ')})`);
      continue;
    }
    if (kind !== 'ticket' && !value) {
      errors.push(`"${label}" needs a value after "${kind}:"`);
      continue;
    }
    if (kind === 'link' && !/^https?:\/\//i.test(value)) {
      errors.push(`"${label}" link must start with http:// or https://`);
      continue;
    }
    out.push({ label, action: kind, value });
  }

  if (out.length > 5) errors.push('Discord allows at most 5 buttons');
  return { buttons: out.slice(0, 5), errors };
}

// ---------- rendering ----------

function buildEmbed(def) {
  const embed = new EmbedBuilder().setColor(def.color ?? 0x5865f2);
  if (def.title) embed.setTitle(def.title.slice(0, 256));
  if (def.text) embed.setDescription(def.text.slice(0, 4000));
  if (def.image) embed.setImage(def.image);
  if (def.footer) embed.setFooter({ text: def.footer.slice(0, 2000) });
  return embed;
}

function buildRow(guildId, name, def) {
  const buttons = def.buttons ?? [];
  if (!buttons.length) return null;

  const row = new ActionRowBuilder();
  buttons.forEach((b, i) => {
    if (b.action === 'link') {
      row.addComponents(
        new ButtonBuilder().setLabel(b.label).setStyle(ButtonStyle.Link).setURL(b.value)
      );
      return;
    }
    const style =
      { role: ButtonStyle.Success, unrole: ButtonStyle.Danger, ticket: ButtonStyle.Primary }[
        b.action
      ] ?? ButtonStyle.Secondary;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`cc:${guildId}:${name}:${i}`)
        .setLabel(b.label)
        .setStyle(style)
    );
  });
  return row;
}

// ---------- registration ----------

async function registerGuild(client, guildId) {
  const names = Object.keys(forGuild(guildId));
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const body = names.slice(0, 100).map((n) => ({
    name: n.slice(0, 32),
    description: (forGuild(guildId)[n].description ?? 'Custom command').slice(0, 100),
    type: 1,
  }));
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body });
  return body.length;
}

async function registerAll(client) {
  let total = 0;
  for (const guild of client.guilds.cache.values()) {
    if (Object.keys(forGuild(guild.id)).length === 0) continue;
    try {
      total += await registerGuild(client, guild.id);
    } catch (err) {
      console.error(`Custom command registration failed for ${guild.id}:`, err.message);
    }
  }
  return total;
}

// ---------- replies ----------

async function replyWith(interaction, guildId, name, def) {
  const payload = { embeds: [buildEmbed(def)] };
  const row = buildRow(guildId, name, def);
  if (row) payload.components = [row];
  await interaction.reply(payload);
}

async function runButton(interaction) {
  const [, guildId, name, idx] = interaction.customId.split(':');
  const def = get(guildId, name);
  if (!def) {
    return interaction.reply({ content: 'That custom command no longer exists.', ephemeral: true });
  }
  const button = def.buttons?.[Number(idx)];
  if (!button) {
    return interaction.reply({ content: 'That button no longer exists.', ephemeral: true });
  }

  const guild = interaction.guild;

  if (button.action === 'text') {
    return interaction.reply({ content: button.value.slice(0, 1900) });
  }

  if (button.action === 'ticket') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const channel = await openTicket(guild, interaction.user);
      return interaction.editReply({ content: `Ticket opened: ${channel}` });
    } catch (err) {
      console.error('Custom command ticket failed:', err);
      return interaction.editReply({ content: 'Could not open a ticket (check my Manage Channels permission).' });
    }
  }

  const idMatch = String(button.value).match(/\d{17,20}/);
  const role = idMatch
    ? guild.roles.cache.get(idMatch[0])
    : guild.roles.cache.find((r) => r.name.toLowerCase() === button.value.toLowerCase().replace(/^@/, ''));

  if (!role) {
    return interaction.reply({ content: `I cannot find the role "${button.value}".`, ephemeral: true });
  }
  if (role.position >= guild.members.me.roles.highest.position) {
    return interaction.reply({ content: `I cannot manage ${role} - my role is below it.`, ephemeral: true });
  }

  try {
    if (button.action === 'role') {
      await interaction.member.roles.add(role, `Custom command button (${name})`);
      return interaction.reply({ content: `✅ Gave you ${role}.`, ephemeral: true });
    }
    if (button.action === 'unrole') {
      await interaction.member.roles.remove(role, `Custom command button (${name})`);
      return interaction.reply({ content: `✅ Removed ${role} from you.`, ephemeral: true });
    }
  } catch (err) {
    console.error('Custom command role action failed:', err);
    return interaction.reply({ content: 'I could not change your roles (permissions or hierarchy).', ephemeral: true });
  }
}

// ---------- the create form ----------

function createModal() {
  const modal = new ModalBuilder().setCustomId('cc:create').setTitle('Create a custom command');

  const inputs = [
    new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Command name (no slash, e.g. rules)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(32)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Embed title')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(256)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('text')
      .setLabel('Message text')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(3900)
      .setRequired(true),
    new TextInputBuilder()
      .setCustomId('image')
      .setLabel('Image URL (optional)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(400)
      .setRequired(false),
    new TextInputBuilder()
      .setCustomId('buttons')
      .setLabel('Buttons (optional): Label | action')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setPlaceholder('Accept | role: Member\nHelp | ticket\nSite | link: https://x.com')
      .setRequired(false),
  ];

  for (const input of inputs) modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

async function handleCreateModal(interaction) {
  const rawName = interaction.fields.getTextInputValue('name').trim().toLowerCase().replace(/^[/$]/, '');
  const name = rawName.replace(/\s+/g, '-');

  if (!/^[a-z0-9_-]{1,32}$/.test(name)) {
    return interaction.reply({
      content: 'Command names can only use letters, numbers, `-` and `_` (max 32 characters).',
      ephemeral: true,
    });
  }
  if (RESERVED.includes(name) || interaction.client.commands.has(name)) {
    return interaction.reply({ content: `\`${name}\` is already a built-in command. Pick another name.`, ephemeral: true });
  }

  const image = interaction.fields.getTextInputValue('image').trim();
  if (image && !/^https?:\/\//i.test(image)) {
    return interaction.reply({ content: 'The image must be a http(s) URL.', ephemeral: true });
  }

  const { buttons, errors } = parseButtons(interaction.fields.getTextInputValue('buttons'));
  if (errors.length) {
    return interaction.reply({ content: `Button problem:\n• ${errors.join('\n• ')}`, ephemeral: true });
  }

  const def = {
    description: 'Custom command',
    title: interaction.fields.getTextInputValue('title').trim(),
    text: interaction.fields.getTextInputValue('text'),
    image: image || null,
    buttons,
    createdBy: interaction.user.tag,
    createdAt: new Date().toISOString(),
  };

  put(interaction.guildId, name, def);

  await interaction.deferReply({ ephemeral: true });
  try {
    await registerGuild(interaction.client, interaction.guildId);
  } catch (err) {
    console.error('Guild command registration failed:', err);
  }

  return interaction.editReply({
    content: [
      `✅ Created \`/${name}\` (also works as \`$${name}\`).`,
      buttons.length ? `Buttons: ${buttons.map((b) => `${b.label} → ${b.action}`).join(', ')}` : 'No buttons.',
      'It may take a few seconds to appear in the slash-command menu.',
    ].join('\n'),
  });
}

module.exports = {
  forGuild,
  get,
  put,
  remove,
  parseButtons,
  buildEmbed,
  buildRow,
  registerGuild,
  registerAll,
  replyWith,
  runButton,
  createModal,
  handleCreateModal,
};
