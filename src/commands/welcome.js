const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../store');
const { render, buildPayload } = require('../member-messages');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Set the welcome message for new members')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Welcome channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Use {user} {username} {server} {count} {inviter} {created}')
    )
    .addBooleanOption((o) => o.setName('embed').setDescription('Send as a coloured embed (default yes)'))
    .addBooleanOption((o) => o.setName('dm').setDescription('Also send the welcome message in DM'))
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

    const channel = interaction.options.getChannel('channel');
    cfg.welcomeChannelId = channel.id;
    const message = interaction.options.getString('message');
    if (message) cfg.welcomeMessage = message;
    const embed = interaction.options.getBoolean('embed');
    if (embed !== null) cfg.welcomeEmbed = embed;
    const dm = interaction.options.getBoolean('dm');
    if (dm !== null) cfg.welcomeDm = dm;
    save('guild-config', data);

    const preview = render(cfg.welcomeMessage ?? 'Welcome {user} to **{server}**! 🎉 You are member **#{count}**.', {
      mention: interaction.user.toString(),
      username: interaction.user.username,
      server: interaction.guild.name,
      count: interaction.guild.memberCount,
      inviterId: interaction.user.id,
      createdAt: `<t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:R>`,
    });

    await interaction.reply({
      content: `✅ Welcome set for ${channel}.${cfg.welcomeDm ? ' Members will also get a DM.' : ''}\n**Preview:**\n${preview}`,
    });
  },
};
