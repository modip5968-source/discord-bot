# Discord Bot

A general-purpose Discord bot with slash commands.

## Commands

- `/ping` — Check the bot's latency
- `/help` — List all commands
- `/kick`, `/ban`, `/timeout` — Moderation (requires the matching Discord permission)
- `/warn`, `/warnings` — Warn members and view warning history
- `/poll` — Create a poll
- `/roll` — Roll dice (e.g. `2d6`)
- `/eightball` — Ask the magic 8-ball
- `/avatar` — Show a member's avatar
- `/serverinfo` — Show info about the server

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Set environment variables:

   | Variable | Description |
   |---|---|
   | `DISCORD_TOKEN` | Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications) |

3. Start the bot:

   ```
   npm start
   ```

Slash commands are registered automatically on startup. Global commands can take
up to an hour to appear the first time.

## Hosting on bot-hosting.in

1. Create a new Node.js app and point it at this repo (or upload the files).
2. Set the start command to `npm start`.
3. Add `DISCORD_TOKEN` as an environment variable (or in the `.env` file) in the panel.
4. Start the app.

Never commit your token to the repo. Always keep it in environment variables.
