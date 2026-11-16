const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { data } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-stats')
    .setDescription('Middleman track record: completed and cancelled trades')
    .addUserOption((o) => o.setName('middleman').setDescription('Show one middleman instead of the whole team')),
  async execute(interaction) {
    const target = interaction.options.getUser('middleman');
    const trades = Object.values(data().trades).filter((t) => t.guildId === interaction.guildId);
    const scope = target ? trades.filter((t) => t.mmId === target.id) : trades;

    const done = scope.filter((t) => t.stage === 'done');
    const cancelled = scope.filter((t) => t.stage === 'cancelled');
    const open = scope.filter((t) => !['done', 'cancelled'].includes(t.stage));
    const claimed = scope.filter((t) => t.mmId);

    if (!scope.length) {
      return interaction.reply({
        content: target ? `No trades handled by ${target} yet.` : 'No middleman trades recorded here yet.',
        ephemeral: true,
      });
    }

    const last = done.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    const rate = done.length + cancelled.length ? Math.round((done.length / (done.length + cancelled.length)) * 100) : 0;

    const embed = new EmbedBuilder()
      .setTitle(target ? `Middleman stats - ${target.tag}` : 'Middleman team stats')
      .setColor(0x57f287)
      .addFields(
        { name: 'Completed', value: `${done.length}`, inline: true },
        { name: 'Cancelled', value: `${cancelled.length}`, inline: true },
        { name: 'Open now', value: `${open.length}`, inline: true },
        { name: 'Completion rate', value: `${rate}%`, inline: true },
        { name: 'Trades claimed', value: `${claimed.length}`, inline: true },
        {
          name: 'Last completed',
          value: last ? `<t:${Math.floor(new Date(last.createdAt).getTime() / 1000)}:R>` : 'none',
          inline: true,
        }
      )
      .setFooter({ text: 'Only trades run through this bot are counted' });

    await interaction.reply({ embeds: [embed] });
  },
};
