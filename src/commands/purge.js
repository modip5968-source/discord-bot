const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const modlog = require('../modlog');

const MAX = 100;          // Discord's bulk delete limit per call
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete recent messages in this channel')
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('How many messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(MAX)
    )
    .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this member'))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the audit log'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? `Purged by ${interaction.user.tag}`;
    const channel = interaction.channel;

    if (!channel?.isTextBased()) {
      return interaction.reply({ content: 'I can only purge messages in text channels.', ephemeral: true });
    }
    if (!channel.guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: 'I need **Manage Messages** in this channel.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // fetch a bit more than asked when filtering by user, so we still hit the target count
    const fetchLimit = target ? MAX : Math.min(amount + 1, MAX);
    const fetched = await channel.messages.fetch({ limit: fetchLimit }).catch(() => null);
    if (!fetched) {
      return interaction.editReply({ content: 'I could not read this channel\'s messages.' });
    }

    const now = Date.now();
    let candidates = [...fetched.values()].filter((m) => now - m.createdTimestamp < TWO_WEEKS);
    const tooOld = fetched.size - candidates.length;
    if (target) candidates = candidates.filter((m) => m.author.id === target.id);

    // our own "deleting" reply is never part of the purge
    candidates = candidates.filter((m) => m.id !== interaction.id);
    candidates = candidates.slice(0, amount);

    if (!candidates.length) {
      return interaction.editReply({
        content: `Nothing to delete${target ? ` from ${target}` : ''}${tooOld ? ' (messages older than 14 days cannot be bulk deleted)' : ''}.`,
      });
    }

    const deleted = await channel.bulkDelete(candidates, true).catch((err) => {
      console.error('Purge failed:', err);
      return null;
    });

    if (!deleted) {
      return interaction.editReply({ content: 'Deleting failed - check my permissions and that the messages are newer than 14 days.' });
    }

    const notes = [];
    if (tooOld) notes.push(`${tooOld} message(s) were older than 14 days and skipped`);
    if (target) notes.push(`filtered to ${target.tag}`);

    const purgeCard = modlog.purged({
      channel,
      amount: deleted.size,
      moderator: interaction.user,
      reason: interaction.options.getString('reason') ?? 'No reason provided',
      target,
    });
    const purgeReason = interaction.options.getString('reason') ?? 'No reason provided';
    const purgeLogged = await modlog.sendCard(interaction.guild, {
      content: `Purged ${deleted.size} message(s) in ${channel} | Reason: ${purgeReason}`,
      embed: purgeCard,
      allowedMentions: { parse: [] },
    });

    await interaction.editReply({
      content: `Deleted ${deleted.size} message(s)${notes.length ? ` - ${notes.join(', ')}` : ''}.${purgeLogged ? ` Logged in ${purgeLogged}.` : ''}`,
      embeds: purgeLogged ? [] : [purgeCard],
    });

    console.log(`Purge in #${channel.name} by ${interaction.user.tag}: ${deleted.size} messages (${reason})`);
  },
};
