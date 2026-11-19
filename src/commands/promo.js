const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { roleLogEmbed } = require('../role-log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promo')
    .setDescription('Give a role to a member (promote)')
    .addUserOption((o) => o.setName('user').setDescription('The member to promote').setRequired(true))
    .addRoleOption((o) => o.setName('role').setDescription('The role to give').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Why they are being promoted'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .setDMPermission(false),
  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason');

    if (!member) return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    if (role.managed) return interaction.reply({ content: 'That role is managed by an integration, I cannot give it.', ephemeral: true });
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: 'That role is higher than (or equal to) my top role. Move my role above it first.', ephemeral: true });
    }
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator) && role.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: 'You cannot give a role that is equal to or higher than your own top role.', ephemeral: true });
    }
    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `${member} already has ${role}.`, ephemeral: true });
    }

    const note = reason || 'No reason provided';
    await member.roles.add(role, `Promoted by ${interaction.user.tag} - ${note}`);

    const embed = roleLogEmbed({
      added: true,
      target: member,
      role,
      moderator: interaction.user,
      reason: note,
      thumbnail: member.user.displayAvatarURL(),
    });

    await interaction.reply({
      content: `Added ${role.name} to ${member} | Reason: ${note}`,
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
