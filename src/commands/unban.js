const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modlog = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID')
    .addStringOption((o) =>
      o.setName('user_id').setDescription('The banned user ID (or paste their mention)').setRequired(true)
    )
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the unban').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const raw = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const id = String(raw).replace(/[^0-9]/g, '');

    if (!/^\d{17,20}$/.test(id)) {
      return interaction.reply({ content: 'That is not a valid user ID. Right-click the user → Copy User ID.', ephemeral: true });
    }

    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) {
      return interaction.reply({ content: `No ban found for \`${id}\` in this server.`, ephemeral: true });
    }

    await interaction.guild.bans.remove(id, `${reason} — by ${interaction.user.tag}`);
    await interaction.reply({
      content: `${ban.user.tag} unbanned | Reason: ${reason}`,
      embeds: [
        modlog.unbanned({
          target: ban.user,
          moderator: interaction.user,
          reason,
        }),
      ],
      allowedMentions: { parse: [] },
    });
  },
};
