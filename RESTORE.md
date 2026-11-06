# 亗 VEXORA - Discord Bot Source

Complete source for the VEXORA bot (44 slash commands + "$" prefix versions).
Last code commit: ba975d6 (Nov 2026). Repository: github.com/modip5968-source/discord-bot

## Structure
- src/index.js            entry point: events, buttons, startup, command registration
- src/prefix.js           "$" prefix command adapter (quotes, positional args)
- src/store.js            JSON data storage in data/*.json
- src/tickets.js          ticket channels + panel
- src/giveaways.js        persistent giveaways (survive restarts)
- src/levels.js           XP / levels / leaderboard
- src/invites.js          invite tracking (who invited whom)
- src/member-messages.js  welcome / goodbye / boost rendering + placeholders
- src/guild-guard.js      allowlist: bot auto-leaves unknown servers
- src/commands/*.js       44 commands (one file each)

## Run it
1. npm install
2. Create .env with: DISCORD_TOKEN=<your bot token>
3. node src/index.js
Commands register automatically on startup.

## Notes
- data/*.json holds runtime data (products, vouches, orders, wallets, levels, invites, config). It is gitignored and NOT in this zip.
- Allowed servers are listed in src/guild-guard.js (DEFAULT_ALLOWED). Add a guild ID there to allow a new server.
- Requires Node.js 18+ (uses fetch and AbortSignal.timeout).
