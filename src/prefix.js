// Prefix command support: runs the same slash commands from messages, e.g. $ping, $kick @user spam
const { ApplicationCommandOptionType } = require('discord.js');

const PREFIX = '$';

const MENTION_RE = /^<@!?(\d+)>$/;
const CHANNEL_RE = /^<#(\d+)>$/;
const ID_RE = /^\d{17,20}$/;

function tokenize(text) {
  const tokens = [];
  let i = 0;
  const s = text.trim();
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    if (s[i] === '"') {
      let j = i + 1;
      let buf = '';
      while (j < s.length && s[j] !== '"') {
        buf += s[j];
        j++;
      }
      tokens.push(buf);
      i = j + 1;
    } else {
      let j = i;
      while (j < s.length && !/\s/.test(s[j])) j++;
      tokens.push(s.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function normalize(name) {
  return name.toLowerCase().replace(/[-_]/g, '');
}

// Parse positional tokens into the command's declared options.
// Quoted segments count as one argument. The LAST string option slurps
// whatever remains, so reasons / messages can be multiple words.
async function parseOptions(message, command, tokens) {
  const resolved = {};
  const opts = command.data.options ?? [];
  let idx = 0;

  for (let i = 0; i < opts.length; i++) {
    const opt = opts[i];
    const isLast = i === opts.length - 1;

    if (opt.type === ApplicationCommandOptionType.String && isLast) {
      if (idx < tokens.length) {
        resolved[opt.name] = tokens.slice(idx).join(' ');
        idx = tokens.length;
      }
      break;
    }

    const tok = tokens[idx];
    if (tok === undefined) break;

    switch (opt.type) {
      case ApplicationCommandOptionType.String:
        resolved[opt.name] = tok;
        idx++;
        break;

      case ApplicationCommandOptionType.Integer: {
        const n = parseInt(tok, 10);
        if (Number.isNaN(n)) return { error: `\`${tok}\` is not a number.` };
        resolved[opt.name] = n;
        idx++;
        break;
      }

      case ApplicationCommandOptionType.Boolean: {
        const v = tok.toLowerCase();
        if (!['true', 'false', 'yes', 'no'].includes(v))
          return { error: `\`${tok}\` is not true/false.` };
        resolved[opt.name] = v === 'true' || v === 'yes';
        idx++;
        break;
      }

      case ApplicationCommandOptionType.User: {
        const m = tok.match(MENTION_RE);
        const id = m ? m[1] : ID_RE.test(tok) ? tok : null;
        if (!id) return { error: `\`${tok}\` is not a user mention or ID.` };
        try {
          resolved[opt.name] = await message.guild.members.fetch(id);
        } catch {
          return { error: 'I could not find that member.' };
        }
        idx++;
        break;
      }

      case ApplicationCommandOptionType.Channel: {
        const m = tok.match(CHANNEL_RE);
        const id = m ? m[1] : ID_RE.test(tok) ? tok : null;
        if (!id) return { error: `\`${tok}\` is not a channel mention or ID.` };
        try {
          resolved[opt.name] = await message.guild.channels.fetch(id);
        } catch {
          return { error: 'I could not find that channel.' };
        }
        idx++;
        break;
      }

      default:
        // Unsupported option type in prefix mode: consume a token
        resolved[opt.name] = tok;
        idx++;
    }
  }

  return { resolved };
}

// A stand-in for a ChatInputCommandInteraction so every existing command
// can run from a message without changes.
class PrefixInteraction {
  constructor(message, resolved) {
    this.message = message;
    this._resolved = resolved;
    this._lastMessage = null;
    this._deferred = false;
    this._replied = false;
    this._ephemeral = false;
  }

  get client() { return this.message.client; }
  get guild() { return this.message.guild; }
  get guildId() { return this.message.guildId; }
  get channel() { return this.message.channel; }
  get channelId() { return this.message.channelId; }
  get user() { return this.message.author; }
  get member() { return this.message.member; }
  get createdTimestamp() { return this.message.createdTimestamp; }
  get replied() { return this._replied; }
  get deferred() { return this._deferred; }
  get memberPermissions() { return this.message.member.permissions; }

  get options() {
    const self = this;
    return {
      getString: (name) => self._resolved[name] ?? null,
      getInteger: (name) => self._resolved[name] ?? null,
      getBoolean: (name) => self._resolved[name] ?? null,
      getMember: (name) => self._resolved[name] ?? null,
      getUser(name) {
        const member = self._resolved[name];
        return member ? member.user : null;
      },
      getChannel: (name) => self._resolved[name] ?? null,
      getRole: () => null,
      getFocused: () => null,
    };
  }

  async _send(payload, ephemeral) {
    const data = typeof payload === 'string' ? { content: payload } : { ...payload };
    data.allowedMentions = { repliedUser: false };
    const sent = await this.message.channel.send(data);
    if (ephemeral) setTimeout(() => sent.delete().catch(() => {}), 20000);
    return sent;
  }

  async reply(payload) {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    if (data.ephemeral) this._ephemeral = true;
    this._lastMessage = await this._send(payload, Boolean(data.ephemeral));
    this._replied = true;
    return data.fetchReply ? this._lastMessage : undefined;
  }

  async deferReply(payload) {
    const data = typeof payload === 'string' ? { content: payload } : (payload ?? {});
    if (data.ephemeral) this._ephemeral = true;
    this._deferred = true;
  }

  async editReply(payload) {
    if (this._lastMessage) {
      const data = typeof payload === 'string' ? { content: payload } : payload;
      await this._lastMessage.edit(data);
      return this._lastMessage;
    }
    this._lastMessage = await this._send(payload, this._ephemeral);
    this._replied = true;
    return this._lastMessage;
  }

  async followUp(payload) {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    this._lastMessage = await this._send(payload, Boolean(data.ephemeral));
    return this._lastMessage;
  }
}

// Returns true if the message was handled as a prefix command.
async function handlePrefixCommand(message, commands) {
  if (!message.content || !message.content.startsWith(PREFIX)) return false;
  const trimmed = message.content.slice(PREFIX.length).trim();
  if (!trimmed) return false;

  const [rawName, ...rest] = trimmed.split(/\s+/);
  const input = rawName.toLowerCase();

  let command = commands.get(input);
  if (!command) {
    const target = normalize(input);
    for (const c of commands.values()) {
      if (normalize(c.data.name) === target) {
        command = c;
        break;
      }
    }
  }
  if (!command) return false; // not ours: ignore silently

  const defPerms = command.data.default_member_permissions;
  if (defPerms && !message.member.permissions.has(BigInt(defPerms))) {
    await message.reply(`You don't have permission to use \`${PREFIX}${command.data.name}\`.`);
    return true;
  }

  const tokens = tokenize(rest.join(' '));
  const parsed = await parseOptions(message, command, tokens);

  if (parsed.error) {
    await message.reply(parsed.error);
    return true;
  }

  // required options check
  for (const opt of command.data.options ?? []) {
    if (opt.required && parsed.resolved[opt.name] === undefined) {
      const usage = (command.data.options ?? [])
        .map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`))
        .join(' ');
      await message.reply(`Missing required argument \`${opt.name}\`. Usage: \`${PREFIX}${command.data.name}${usage ? ' ' + usage : ''}\``);
      return true;
    }
  }

  const interaction = new PrefixInteraction(message, parsed.resolved);
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in ${PREFIX}${command.data.name}:`, err);
    const reply = 'Something went wrong running that command.';
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await message.reply(reply).catch(() => {});
    }
  }
  return true;
}

module.exports = { PREFIX, handlePrefixCommand };
