const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demo')
    .setDescription('Remove a role from a member (demote)')
    .addUserOption((o) => o.setName('user').setDescription('The member to demote').setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('The role to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (role.managed) return interaction.reply({ content: 'That role is managed by an integration, I cannot remove it.', ephemeral: true });
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: 'That role is higher than (or equal to) my top role. Move my role above it first.', ephemeral: true });
    }
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator) && role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: 'You cannot remove a role that is equal to or higher than your own top role.', ephemeral: true });
    }
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `${member} does not have ${role}.`, ephemeral: true });
    }

    await member.roles.remove(role, `Demoted by ${interaction.user.tag}`);
    await interaction.reply(`⬇️ Demoted ${member} - removed the role ${role}.`);
  },
};
