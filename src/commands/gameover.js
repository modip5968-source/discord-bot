// Scam-pattern demo / victim intake.
// Shows HOW fake middleman servers farm victims (the "scam 3 people to get your items back" script)
// as a warning, and gives the victim a real way out: a recovery ticket + an optional tag role.
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { openTicket } = require('../tickets');
const { getConfig } = require('../middleman');

const SCAMMED_ROLE_ID = '1571777897780215968';

const SCAM_SCRIPT = [
  '> You just got scammed. Read carefully to get your things back.',
  '> The only way to get your items back is to scam 3 people using the same fake middleman trick.',
  '> Your stuff will only return after scamming 3 people.',
  '> Accept and become rich, or decline and stay broke.',
].join('\n');

function demoEmbed() {
  return new EmbedBuilder()
    .setTitle('⛔ SCAM PATTERN DEMO - do not fall for this')
    .setColor(0xed4245)
    .setDescription(
      [
        '**This is the script fake "middleman" servers use. Shown here so you can recognise it.**',
        '',
        '```',
        SCAM_SCRIPT,
        '```',
        '**What it actually is**',
        '• There is no recovery. Nothing is ever "returned" - the scammer keeps your items.',
        '• The "scam 3 people" part turns you into their next recruiter, so their scam keeps running through you.',
        '• Anyone who asks you to scam others to get your own stuff back is scamming you a second time.',
        '',
        '**If you were genuinely scammed, do this instead**',
        '1. Screenshot everything: the offer, the trade, the middleman\'s profile and ID.',
        '2. Never send more items, coins or gift cards to "unlock" a refund.',
        '3. Open a recovery ticket below - staff will review your proof and log the scammer.',
        '',
        '**A real middleman never DMs you first, never asks for your password, and never needs you to scam anyone.**',
      ].join('\n')
    )
    .setFooter({ text: 'Obsidian MM Service - anti-scam awareness' });
}

function demoRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('go:help')
      .setLabel('I got scammed - open a ticket')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('go:dismiss')
      .setLabel('Dismiss')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gameover')
    .setDescription('Show the fake-middleman scam pattern and how to get real help')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.reply({
      embeds: [demoEmbed()],
      components: [demoRow()],
    });
  },
  demoEmbed,
  demoRow,
  async handleButton(interaction) {
    const { customId } = interaction;

    if (customId === 'go:dismiss') {
      return interaction.reply({
        content: `**${interaction.user}** dismissed this. If you ever do get scammed, run \`/gameover\` again - no shame in it.`,
        allowedMentions: { users: [interaction.user.id] },
      });
    }

    if (customId === 'go:help') {
      const guild = interaction.guild;
      const member = interaction.member;

      await interaction.deferReply({ ephemeral: true });

      // tag the victim so staff can spot repeat scammers in their DMs
      const tagRole = guild.roles.cache.get(SCAMMED_ROLE_ID);
      if (tagRole && tagRole.position < guild.members.me.roles.highest.position) {
        await member.roles.add(tagRole, 'Reported being scammed').catch(() => {});
      }

      let channel;
      try {
        channel = await openTicket(guild, interaction.user);
      } catch (err) {
        console.error('Recovery ticket failed:', err);
        return interaction.editReply({
          content: 'I could not open a ticket (check my Manage Channels permission). Please open one manually.',
        });
      }

      const cfg = getConfig(guild.id);
      const mmRole = cfg?.mmRoleId ? guild.roles.cache.get(cfg.mmRoleId) : null;

      await channel
        .send({
          content: `${interaction.user}${mmRole ? ` ${mmRole}` : ''} - recovery request. Please paste your proof here (screenshots, trade IDs, the middleman's profile).`,
          allowedMentions: { users: [interaction.user.id], roles: mmRole ? [mmRole.id] : [] },
          embeds: [
            new EmbedBuilder()
              .setTitle('🛡️ Scam recovery ticket')
              .setColor(0x5865f2)
              .setDescription(
                [
                  '**Staff checklist**',
                  '1. Check the proof: was a real middleman from this server involved, or an impostor?',
                  '2. Log the scammer ID, screenshots and the trade details.',
                  '3. Never promise a refund you cannot deliver.',
                  '',
                  '**Opened by:** ' + interaction.user.tag,
                ].join('\n')
              ),
          ],
        })
        .catch(() => {});

      return interaction.editReply({ content: `Ticket opened: ${channel}` });
    }
  },
};
