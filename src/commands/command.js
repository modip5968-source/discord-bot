const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const cc = require('../custom-commands');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('command')
    .setDescription('Create and manage custom commands')
    .addSubcommand((s) => s.setName('create').setDescription('Create a custom command with an embed, image and buttons'))
    .addSubcommand((s) => s.setName('list').setDescription('List the custom commands in this server'))
    .addSubcommand((s) =>
      s
        .setName('delete')
        .setDescription('Delete a custom command')
        .addStringOption((o) => o.setName('name').setDescription('The command name').setRequired(true).setAutocomplete(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const names = Object.keys(cc.forGuild(interaction.guildId));
    await interaction.respond(
      names.filter((n) => n.includes(focused)).slice(0, 25).map((n) => ({ name: `/${n}`, value: n }))
    );
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      // opens the form: name, title, text, image, buttons
      return interaction.showModal(cc.createModal());
    }

    if (sub === 'list') {
      const cmds = cc.forGuild(interaction.guildId);
      const names = Object.keys(cmds);
      if (!names.length) {
        return interaction.reply({ content: 'No custom commands yet. Use `/command create`.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle(`Custom commands (${names.length})`)
        .setColor(0x5865f2)
        .setDescription(
          names
            .map((n) => {
              const d = cmds[n];
              const b = d.buttons?.length ? ` · ${d.buttons.length} button(s)` : '';
              return `\`/${n}\` — ${d.title}${b}`;
            })
            .join('\n')
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      if (!cc.remove(interaction.guildId, name)) {
        return interaction.reply({ content: `No custom command called \`${name}\`.`, ephemeral: true });
      }
      await interaction.deferReply({ ephemeral: true });
      try {
        await cc.registerGuild(interaction.client, interaction.guildId);
      } catch (err) {
        console.error('Guild command registration failed:', err);
      }
      return interaction.editReply({ content: `🗑️ Deleted \`/${name}\`.` });
    }
  },
};
