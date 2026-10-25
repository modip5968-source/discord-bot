const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Set the welcome message for new members')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Message: use {user}, {username} and {server}')
    )
    .addBooleanOption((o) => o.setName('clear').setDescription('Disable welcome messages'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const data = load('guild-config');
    const cfg = data[interaction.guildId] ?? (data[interaction.guildId] = {});

    if (interaction.options.getBoolean('clear')) {
      cfg.welcomeChannelId = null;
      save('guild-config', data);
      return interaction.reply('👋 Welcome messages disabled.');
    }

    cfg.welcomeChannelId = interaction.options.getChannel('channel').id;
    cfg.welcomeMessage = interaction.options.getString('message') ?? 'Welcome {user} to **{server}**! 🎉';
    save('guild-config', data);

    const preview = cfg.welcomeMessage
      .replaceAll('{user}', interaction.user.toString())
      .replaceAll('{username}', interaction.user.username)
      .replaceAll('{server}', interaction.guild.name);

    await interaction.reply(`✅ Welcome set for ${interaction.options.getChannel('channel')}. Preview:\n${preview}`);
  },
};
