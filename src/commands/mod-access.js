const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const access = require('../mod-access');

const COVERED = [
  'warn', 'unwarn', 'warnings', 'mute', 'unmute',
  'ban', 'unban', 'kick', 'purge', 'nuke', 'lock', 'unlock',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod-access')
    .setDescription('Give a role access to the moderation commands')
    .addRoleOption((o) =>
      o.setName('role').setDescription('Role that should be able to use moderation commands')
    )
    .addBooleanOption((o) =>
      o.setName('remove').setDescription('Remove access from this role instead of granting it')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const remove = interaction.options.getBoolean('remove') ?? false;

    // No role given: show current setup
    if (!role) {
      const ids = access.getAccessRoleIds(interaction.guildId);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Moderation Access')
        .addFields(
          {
            name: 'Roles with access',
            value: ids.length ? ids.map((id) => `<@&${id}>`).join('\n') : 'None yet - run `/mod-access role:@YourModRole`',
          },
          { name: 'Commands covered', value: COVERED.map((c) => `\`${c}\``).join(', ') },
          {
            name: 'Hierarchy rule',
            value: 'Nobody can grant access to, or moderate, a role equal to or above their own top role. Administrators and the server owner bypass this.',
          }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Hierarchy: you cannot hand out a role at or above your own level
    if (!access.canGrantRole(interaction, role)) {
      return interaction.reply({
        content: `You cannot ${remove ? 'edit access for' : 'grant access to'} ${role} - it is equal to or above your own top role.`,
        ephemeral: true,
      });
    }

    if (role.managed) {
      return interaction.reply({ content: `${role} is managed by an integration, pick a normal role.`, ephemeral: true });
    }

    const ids = remove
      ? access.removeAccessRole(interaction.guildId, role.id)
      : access.addAccessRole(interaction.guildId, role.id);

    const embed = new EmbedBuilder()
      .setColor(remove ? 0xed4245 : 0x57f287)
      .setTitle(remove ? 'Moderation Access Removed' : 'Moderation Access Granted')
      .addFields(
        { name: 'Role', value: `${role}` },
        { name: 'Changed by', value: `${interaction.user}` },
        {
          name: 'Roles with access now',
          value: ids.length ? ids.map((id) => `<@&${id}>`).join('\n') : 'None',
        }
      );

    return interaction.reply({ embeds: [embed] });
  },
};
