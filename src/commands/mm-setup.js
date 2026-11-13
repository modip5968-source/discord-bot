const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { setConfig, getConfig } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-setup')
    .setDescription('Set up the middleman system and post the request panel')
    .addRoleOption((o) => o.setName('mm_role').setDescription('Role that can claim middleman tickets').setRequired(true))
    .addChannelOption((o) =>
      o.setName('log_channel').setDescription('Where trade logs and transcripts go (staff only)').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addChannelOption((o) =>
      o.setName('category').setDescription('Category where trade tickets are created (optional)').addChannelTypes(ChannelType.GuildCategory)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    const mmRole = interaction.options.getRole('mm_role');
    const logChannel = interaction.options.getChannel('log_channel');
    const category = interaction.options.getChannel('category');

    setConfig(interaction.guildId, {
      mmRoleId: mmRole.id,
      logChannelId: logChannel.id,
      categoryId: category?.id ?? null,
    });

    const embed = new EmbedBuilder()
      .setTitle('🤝 Middleman Service')
      .setColor(0x5865f2)
      .setDescription(
        [
          "Trading with someone you don't know? Use a middleman so nobody gets scammed.",
          '',
          '**How it works**',
          '1. Press the button and fill in the trade',
          '2. Both traders confirm the terms',
          '3. A staff middleman collects and releases the items',
          '',
          '⚠️ Staff will never DM you first. Only trade inside your ticket.',
        ].join('\n')
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mm:request').setLabel('Request Middleman').setEmoji('🤝').setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      content: `✅ Middleman system set up. MM role: ${mmRole}. Log channel: ${logChannel}.${category ? ` Tickets in: ${category}.` : ''}`,
      ephemeral: true,
    });
  },
};
