const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const WARN_FILE = path.join(DATA_DIR, 'warnings.json');

function loadWarnings() {
  try {
    return JSON.parse(fs.readFileSync(WARN_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveWarnings(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(WARN_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption((opt) =>
      opt.setName('member').setDescription('The member to warn').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for the warning')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    const warnings = loadWarnings();
    const key = `${interaction.guildId}:${user.id}`;
    warnings[key] = warnings[key] ?? [];
    warnings[key].push({ reason, by: interaction.user.tag, at: new Date().toISOString() });
    saveWarnings(warnings);

    await interaction.reply(
      `⚠️ **${user.tag}** warned (${warnings[key].length} total). Reason: ${reason}`
    );

    try {
      await user.send(`You were warned in **${interaction.guild.name}**: ${reason}`);
    } catch {
      // DMs closed, ignore
    }
  },
  loadWarnings,
};
