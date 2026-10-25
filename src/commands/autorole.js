const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Set a role to give new members automatically')
    .addRoleOption((o) => o.setName('role').setDescription('Role to give on join').setRequired(true))
    .addBooleanOption((o) => o.setName('clear').setDescription('Disable auto-role'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const data = load('guild-config');
    const cfg = data[interaction.guildId] ?? (data[interaction.guildId] = {});

    if (interaction.options.getBoolean('clear')) {
      cfg.autoroleId = null;
      save('guild-config', data);
      return interaction.reply('🔕 Auto-role disabled.');
    }

    const role = interaction.options.getRole('role');
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: "I can't assign that role — move my role above it in the server settings.", ephemeral: true });
    }

    cfg.autoroleId = role.id;
    save('guild-config', data);
    await interaction.reply(`✅ New members will now get ${role} automatically.`);
  },
};
