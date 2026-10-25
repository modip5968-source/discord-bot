const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createGiveaway } = require('../giveaways');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway with a button to enter')
    .addStringOption((o) => o.setName('prize').setDescription('The prize').setRequired(true))
    .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Duration in minutes (default 60)').setMinValue(1).setMaxValue(20160))
    .addChannelOption((o) => o.setName('channel').setDescription('Channel (defaults to this one)').addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const winners = interaction.options.getInteger('winners') ?? 1;
    const minutes = interaction.options.getInteger('minutes') ?? 60;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    try {
      const gw = await createGiveaway(interaction, { prize, winners, minutes, channel });
      await interaction.reply({ content: `🎉 Giveaway started in ${channel}! (ID: ${gw.id})`, ephemeral: true });
    } catch (err) {
      console.error('Giveaway start failed:', err);
      await interaction.reply({ content: 'I could not start the giveaway there (check my permissions).', ephemeral: true });
    }
  },
};
