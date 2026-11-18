const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { load, save } = require('../store');
const { getConfig } = require('../middleman');

const STORE = 'mm-reports';

function reports(guildId) {
  const d = load(STORE);
  return d[guildId] ?? [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-report')
    .setDescription('Report a scammer or a fake middleman to staff')
    .addUserOption((o) => o.setName('user').setDescription('Who scammed or impersonated staff').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('What happened - keep it factual').setRequired(true))
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot report yourself.', ephemeral: true });
    }

    const all = load(STORE);
    all[interaction.guildId] = all[interaction.guildId] ?? [];
    all[interaction.guildId].push({
      userId: target.id,
      tag: target.tag,
      reason,
      by: interaction.user.tag,
      byId: interaction.user.id,
      channelId: interaction.channelId,
      at: new Date().toISOString(),
    });
    save(STORE, all);

    const prior = all[interaction.guildId].filter((r) => r.userId === target.id).length;

    const cfg = getConfig(interaction.guildId);
    const logChannel = cfg?.logChannelId ? interaction.guild.channels.cache.get(cfg.logChannelId) : null;
    const mmRole = cfg?.mmRoleId ? interaction.guild.roles.cache.get(cfg.mmRoleId) : null;

    const embed = new EmbedBuilder()
      .setTitle('🚨 Scammer report')
      .setColor(0xed4245)
      .addFields(
        { name: 'Reported user', value: `${target.tag} (\`${target.id}\`)`, inline: true },
        { name: 'Reported by', value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
        { name: 'Reports against them', value: `${prior}`, inline: true },
        { name: 'Reason', value: reason.slice(0, 950) },
        { name: 'Where', value: `<#${interaction.channelId}>`, inline: true }
      )
      .setFooter({ text: 'Staff: verify proof before acting. Never refund what you cannot deliver.' });

    const payload = {
      content: mmRole ? `<@&${mmRole.id}>` : '',
      embeds: [embed],
      allowedMentions: { roles: mmRole ? [mmRole.id] : [] },
    };

    if (logChannel) await logChannel.send(payload).catch(() => {});
    else if (mmRole) await interaction.channel.send(payload).catch(() => {});

    await interaction.reply({
      content: `✅ Report sent to staff.${prior > 1 ? ` (${prior} reports on this user so far)` : ''} Keep your screenshots - staff may ask for them.`,
      ephemeral: true,
    });
  },
};
