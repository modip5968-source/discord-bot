const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getJobs, removeJob } = require('../messager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messager-stop')
    .setDescription('List or cancel scheduled messager posts')
    .addStringOption((o) => o.setName('id').setDescription('ID to cancel (leave blank to list all)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const id = interaction.options.getString('id')?.trim();

    if (id) {
      const ok = removeJob(id);
      return interaction.reply({
        content: ok ? `Cancelled messager \`${id}\`.` : `No messager with ID \`${id}\`.`,
        ephemeral: true,
      });
    }

    const jobs = Object.values(getJobs()).filter((j) => j.guildId === interaction.guildId);
    if (!jobs.length) {
      return interaction.reply({ content: 'Nothing scheduled right now.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Scheduled messagers')
      .setDescription(
        jobs
          .sort((a, b) => a.nextRun - b.nextRun)
          .map(
            (j) =>
              `**${j.id}** · ${j.sent}/${j.amount} sent · every ${Math.round(j.intervalMs / 60000)}m · next <t:${Math.floor(j.nextRun / 1000)}:R>\n> ${j.text.slice(0, 80).replace(/\n/g, ' ')}${j.text.length > 80 ? '…' : ''}\n> <#${j.channelId}>`
          )
          .join('\n\n')
      )
      .setFooter({ text: 'Cancel one with /messager-stop id:<id>' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
