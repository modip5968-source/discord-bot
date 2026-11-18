const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Wipe this channel - deletes and recreates it with the same name, category and permissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.channel;

    if (!channel || !channel.guild) {
      return interaction.reply({ content: 'This only works inside a server channel.', ephemeral: true });
    }
    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      return interaction.reply({ content: 'I can only nuke text or announcement channels.', ephemeral: true });
    }

    const me = channel.guild.members.me;
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: 'I need the **Manage Channels** permission to do this.', ephemeral: true });
    }

    // snapshot everything worth keeping
    const snapshot = {
      name: channel.name,
      type: channel.type,
      topic: channel.topic ?? undefined,
      nsfw: channel.nsfw,
      slowmode: channel.rateLimitPerUser ?? 0,
      parentId: channel.parentId ?? undefined,
      position: channel.rawPosition ?? channel.position,
      overwrites: channel.permissionOverwrites.cache.map((o) => ({
        id: o.id,
        type: o.type,
        allow: o.allow,
        deny: o.deny,
      })),
    };

    const nukedBy = interaction.user;
    const reason = `Channel nuked by ${nukedBy.tag}`;

    // acknowledge before the channel disappears
    await interaction.reply({ content: '💥 Nuking this channel…', ephemeral: false }).catch(() => {});

    let created;
    try {
      await channel.delete(reason);
      created = await channel.guild.channels.create({
        name: snapshot.name,
        type: snapshot.type,
        topic: snapshot.topic,
        nsfw: snapshot.nsfw,
        rateLimitPerUser: snapshot.slowmode,
        parent: snapshot.parentId,
        permissionOverwrites: snapshot.overwrites,
        reason,
      });
      if (typeof snapshot.position === 'number') {
        await created.setPosition(snapshot.position).catch(() => {});
      }
    } catch (err) {
      console.error('Nuke failed:', err);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('💥 Channel nuked')
      .setColor(0xed4245)
      .setDescription(`Wiped and rebuilt by ${nukedBy}.\nSame name, category and permissions as before.`)
      .setTimestamp();

    await created.send({ embeds: [embed] }).catch(() => {});
  },
};
