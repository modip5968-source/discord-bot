// Prefix command support: runs the same slash commands from messages, e.g. $ping, $kick @user spam
const { ApplicationCommandOptionType } = require('discord.js');

const PREFIX = '$';

const MENTION_RE = /^<@!?(\d+)>$/;
const CHANNEL_RE = /^<#(\d+)>$/;
const ID_RE = /^\d{17,20}$/;
const ROLE_RE = /^<@&(\d+)>$/;

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
// Quoted segments count as one argument. Each option consumes one token;
// any leftover tokens are appended to the last text argument, so reasons
// and messages can be multiple words. Optional options whose token does not
// look like the right type are skipped instead of consuming the token.
async function parseOptions(message, command, tokens) {
  const resolved = {};
  const strings = [];
  const opts = command.data.options ?? [];
  let idx = 0;

  for (const opt of opts) {
    const tok = tokens[idx];
    if (tok === undefined) break;

    switch (opt.type) {
      case ApplicationCommandOptionType.String: {
        // image arguments must look like URLs
        if (opt.name === 'image' && !/^https?:\/\//i.test(tok)) {
          if (!opt.required) continue;
          return { error: `The image must be a valid http(s) URL.` };
        }
        // a URL token is almost always meant for a later 'image' option
        if (
          opt.name !== 'image' &&
          /^https?:\/\//i.test(tok) &&
          opts.some((o) => o.name === 'image')
        ) {
          continue;
        }
        resolved[opt.name] = tok;
        strings.push(opt.name);
        idx++;
        break;
      }

      case ApplicationCommandOptionType.Integer: {
        if (!/^-?\d+$/.test(tok)) {
          if (!opt.required) continue;
          return { error: `\`${tok}\` is not a number.` };
        }
        resolved[opt.name] = parseInt(tok, 10);
        idx++;
        break;
      }

      case ApplicationCommandOptionType.Boolean: {
        const v = tok.toLowerCase();
        if (!['true', 'false', 'yes', 'no'].includes(v)) {
          if (!opt.required) continue;
          return { error: `\`${tok}\` is not true/false.` };
        }
        resolved[opt.name] = v === 'true' || v === 'yes';
        idx++;
        break;
      }

      case ApplicationCommandOptionType.User: {
        const m = tok.match(MENTION_RE);
        const id = m ? m[1] : ID_RE.test(tok) ? tok : null;
        if (!id) {
          if (!opt.required) continue;
          return { error: `\`${tok}\` is not a user mention or ID.` };
        }
        try {
          resolved[opt.name] = await message.guild.members.fetch(id);
        } catch {
          if (!opt.required) continue;
          return { error: 'I could not find that member.' };
        }
        idx++;
        break;
      }

      case ApplicationCommandOptionType.Channel: {
        const m = tok.match(CHANNEL_RE);
        const id = m ? m[1] : ID_RE.test(tok) ? tok : null;
        if (!id) {
          if (!opt.required) continue;
          return { error: `\`${tok}\` is not a channel mention or ID.` };
        }
        try {
          resolved[opt.name] = await message.guild.channels.fetch(id);
        } catch {
          if (!opt.required) continue;
          return { error: 'I could not find that channel.' };
        }
        idx++;
        break;
      }

      case ApplicationCommandOptionType.Role: {
        const m = tok.match(ROLE_RE);
        const id = m ? m[1] : ID_RE.test(tok) ? tok : null;
        if (!id) {
          if (!opt.required) continue;
          return { error: `\`${tok}\` is not a role mention or ID.` };
        }
        try {
          resolved[opt.name] = await message.guild.roles.fetch(id);
        } catch {
          if (!opt.required) continue;
          return { error: 'I could not find that role.' };
        }
        idx++;
        break;
      }

      default:
        resolved[opt.name] = tok;
        idx++;
    }
  }

  // Append anything left over to the last text argument (never the image URL)
  if (idx < tokens.length) {
    const textOpts = (command.data.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.String && o.name !== 'image'
    );
    const last = textOpts[textOpts.length - 1];
    if (last) {
      resolved[last.name] = [resolved[last.name], ...tokens.slice(idx)]
        .filter((part) => part !== undefined && part !== '')
        .join(' ');
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
      getRole: (name) => self._resolved[name] ?? null,
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
