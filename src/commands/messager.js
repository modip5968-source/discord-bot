const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { parseInterval, humanInterval, addJob, getJobs, MAX_AMOUNT } = require('../messager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messager')
    .setDescription('Send a message in an embed, repeating on a timer')
    .addStringOption((o) =>
      o.setName('message').setDescription('What to say').setRequired(true).setMaxLength(2000)
    )
    .addStringOption((o) =>
      o
        .setName('time')
        .setDescription('Repeat every: 30m, 2h, 1d (minutes if no unit)')
        .setRequired(true)
    )
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('How many times to send it').setRequired(true).setMinValue(1).setMaxValue(MAX_AMOUNT)
    )
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Where to post (defaults to this channel)').addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((o) =>
      o.setName('title').setDescription('Bold heading above the message (optional)').setMaxLength(256)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),

  async execute(interaction) {
    const text = interaction.options.getString('message').trim();
    const title = interaction.options.getString('title')?.trim() || null;
    const rawTime = interaction.options.getString('time');
    const amount = interaction.options.getInteger('amount');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const intervalMs = parseInterval(rawTime);
    if (!intervalMs) {
      return interaction.reply({
        content: 'Time must be between 1 minute and 30 days - try `30m`, `2h`, `1d`, or just minutes like `45`.',
        ephemeral: true,
      });
    }

    const perms = channel.permissionsFor(interaction.guild.members.me);
    if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.EmbedLinks)) {
      return interaction.reply({
        content: `I need **Send Messages** and **Embed Links** in ${channel}.`,
        ephemeral: true,
      });
    }

    const job = addJob({
      guildId: interaction.guildId,
      channelId: channel.id,
      text,
      title,
      intervalMs,
      amount,
      createdBy: interaction.user.id,
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('✅ Messager scheduled')
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'Every', value: humanInterval(intervalMs), inline: true },
        { name: 'Times', value: `0 / ${amount}`, inline: true },
        { name: 'First post', value: `<t:${Math.floor(job.nextRun / 1000)}:R> (<t:${Math.floor(job.nextRun / 1000)}:t>)` },
        { name: 'Title', value: title ?? '*(none)*', inline: true },
        { name: 'Message', value: text.length > 900 ? `${text.slice(0, 900)}…` : text }
      )
      .setFooter({ text: `ID ${job.id} - stop it with /messager-stop` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
