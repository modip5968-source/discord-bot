# GAMER.GG | MARKETPLACE - Backup

This is a complete backup of the Discord bot (41 commands), commit 74cb7dc (Oct 25, 2026).

## What's inside
- `src/` - all code: 41 commands (src/commands/), prefix adapter (src/prefix.js),
  ticket system (src/tickets.js), giveaways (src/giveaways.js), levels (src/levels.js),
  JSON store (src/store.js), main entry (src/index.js)
- `package.json` / `package-lock.json` - dependencies (discord.js v14)
- `README.md` - full command reference

## Not included (on purpose)
- `.env` with the DISCORD_TOKEN (stored as a secret in the hosting panel)
- `data/*.json` runtime data (products, vouches, orders, wallets, XP) - lives on the host
- `node_modules` (installed automatically with `npm install`)

## To restore on any host
1. Unzip, run `npm install`
2. Create a `.env` file: `DISCORD_TOKEN=<bot token>`
3. Run `node src/index.js`
4. Bot registers all 41 slash commands on startup

Say "restore this bot" and hand this zip back to the assistant - the full history,
architecture and deployment steps are in its memory.
