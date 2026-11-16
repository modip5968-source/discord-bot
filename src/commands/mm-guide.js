const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../middleman');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mm-guide')
    .setDescription('Post the safe middleman trading guide'),
  async execute(interaction) {
    const cfg = getConfig(interaction.guildId);
    const roleId = cfg?.mmRoleId;

    const embed = new EmbedBuilder()
      .setTitle('🛡️ How a safe middleman trade works')
      .setColor(0x57f287)
      .setDescription(
        [
          '**The only safe way to trade with someone you do not trust**',
          '',
          '1. Open a ticket with `/middleman @partner` or the panel button.',
          '2. Both traders confirm the terms in the ticket.',
          `3. A ${roleId ? `<@&${roleId}>` : 'staff middleman'} claims the ticket. That name is the only person you send items to.`,
          '4. The middleman holds both sides, then releases them.',
          '5. You press **I Received My Items**. The bot logs a transcript of every ticket.',
          '',
          '**Red flags - stop and call staff**',
          '• Someone DMs you first offering to middleman. Staff never DM first.',
          '• They ask you to send items to a "friend" or an alt "to verify".',
          '• They say your items are stuck and you must trade or pay to unlock them.',
          '• They ask you to scam someone else to recover your own items. That is a second scam.',
          '',
          '**Proof beats trust** - keep screenshots of every trade and every DM. The bot transcript is your evidence.',
        ].join('\n')
      )
      .setFooter({ text: 'If it is not in a ticket with a claimed middleman, it is not protected.' });

    await interaction.reply({ embeds: [embed] });
  },
};
