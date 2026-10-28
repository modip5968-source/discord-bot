const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../store');
const { render } = require('../member-messages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Set the leave (goodbye) message for members who leave')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Goodbye channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Use {user} {username} {server} {count}')
    )
    .addBooleanOption((o) => o.setName('embed').setDescription('Send as a coloured embed (default yes)'))
    .addBooleanOption((o) => o.setName('clear').setDescription('Disable goodbye messages'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const data = load('guild-config');
    const cfg = data[interaction.guildId] ?? (data[interaction.guildId] = {});

    if (interaction.options.getBoolean('clear')) {
      cfg.goodbyeChannelId = null;
      save('guild-config', data);
      return interaction.reply('👋 Goodbye messages disabled.');
    }

    const channel = interaction.options.getChannel('channel');
    cfg.goodbyeChannelId = channel.id;
    const message = interaction.options.getString('message');
    if (message) cfg.goodbyeMessage = message;
    const embed = interaction.options.getBoolean('embed');
    if (embed !== null) cfg.goodbyeEmbed = embed;
    save('guild-config', data);

    const preview = render(cfg.goodbyeMessage ?? '👋 **{username}** left **{server}**. Now **{count}** members.', {
      username: interaction.user.username,
      server: interaction.guild.name,
      count: interaction.guild.memberCount,
    });

    await interaction.reply({ content: `✅ Goodbye messages set for ${channel}.\n**Preview:**\n${preview}` });
  },
};
