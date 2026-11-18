const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const autoVouch = require('../vouches');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch-setup')
    .setDescription('Choose the channel where completed trades post an automatic vouch')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Vouch channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    autoVouch.setVouchChannelId(interaction.guildId, channel.id);

    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me).has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
      return interaction.reply({
        content: `⚠️ Saved ${channel} but I need **Send Messages** and **Embed Links** there to post vouches.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Auto vouch enabled')
      .setColor(0x57f287)
      .setDescription(
        [
          `Every middleman trade that completes will post a vouch in ${channel}.`,
          '',
          'Both traders get an **Add your review** button with a 1-5 star rating and optional proof image.',
          'Reviews also count toward `/vouches` reputation.',
        ].join('\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
