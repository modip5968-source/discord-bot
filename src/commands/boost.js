const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../store');
const { render } = require('../member-messages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boost')
    .setDescription('Set the server boost thank-you message')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Boost announcement channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Use {user} {username} {server} {count}')
    )
    .addBooleanOption((o) => o.setName('embed').setDescription('Send as a coloured embed (default yes)'))
    .addBooleanOption((o) => o.setName('clear').setDescription('Disable boost messages'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const data = load('guild-config');
    const cfg = data[interaction.guildId] ?? (data[interaction.guildId] = {});

    if (interaction.options.getBoolean('clear')) {
      cfg.boostChannelId = null;
      save('guild-config', data);
      return interaction.reply('🚀 Boost messages disabled.');
    }

    const channel = interaction.options.getChannel('channel');
    cfg.boostChannelId = channel.id;
    const message = interaction.options.getString('message');
    if (message) cfg.boostMessage = message;
    const embed = interaction.options.getBoolean('embed');
    if (embed !== null) cfg.boostEmbed = embed;
    save('guild-config', data);

    const preview = render(cfg.boostMessage ?? '🚀 {user} just boosted **{server}**! Thank you so much 💜', {
      mention: interaction.user.toString(),
      username: interaction.user.username,
      server: interaction.guild.name,
      count: interaction.guild.premiumSubscriptionCount ?? 0,
    });

    await interaction.reply({ content: `✅ Boost messages set for ${channel}.\n**Preview:**\n${preview}` });
  },
};
