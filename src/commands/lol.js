const { SlashCommandBuilder } = require('discord.js');

const TIMES = 20;
const DELAY_MS = 1000; // spacing keeps us inside Discord's per-channel rate limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lol')
    .setDescription('lol at someone - sends 20 messages')
    .addUserOption((o) => o.setName('user').setDescription('Who got ezzzz').setRequired(true))
    .setDMPermission(false),
  async execute(interaction) {
    // works for /lol and $lol (the prefix shim exposes the same getters)
    const member = interaction.options.getMember('user');
    const target = interaction.options.getUser('user') ?? member?.user;

    if (!target) {
      return interaction.reply({ content: 'Could not find that user.', ephemeral: true });
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased || !channel.isTextBased()) {
      return interaction.reply({ content: 'This command only works in a text channel.', ephemeral: true });
    }

    // acknowledge immediately so the slash command does not time out
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const text = `lol ${target} got ezzzz`;
    for (let i = 0; i < TIMES; i++) {
      await channel
        .send({ content: text, allowedMentions: { users: [target.id] } })
        .catch((err) => console.error('lol send failed:', err.message));
      if (i < TIMES - 1) await sleep(DELAY_MS);
    }

    await interaction
      .editReply(`✅ Done - ${TIMES} messages sent pinging ${target}.`)
      .catch(() => {});
  },
};
