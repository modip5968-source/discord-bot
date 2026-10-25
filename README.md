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
- `/say` — Make the bot say something (Manage Messages)
- `/announce` — Send an announcement embed to a channel (Manage Messages)
- `/embed` — Send a custom embed with title, text and color (Manage Messages)
- `/afk` — Set yourself AFK; the bot replies when you get mentioned and clears it when you return

## Ticket system

- `/ticket-panel` — Post a ticket panel with an "Open a Ticket" button (Manage Channels)
- `/ticket-panel-edit` — Edit a panel's title, description, image or button label (Manage Channels)
- `/lock` — Lock a channel so members cannot send messages (Manage Channels)
- `/unlock` — Unlock a previously locked channel (Manage Channels)
- `/ticket-open` — Open a private ticket channel (also possible via the panel button)
- `/ticket-add` — Add a member to a ticket (Manage Channels)
- `/ticket-close` — Close and delete a ticket (staff or the ticket opener; also possible via the in-ticket button)

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

## Shop features

- **Catalog**: `/product-add` (name, price, stock, description, image), `/product-list`, `/product-remove <id>`, `/product-stock <id> <count>` (-1 = unlimited, 0 = sold out). Manage Server.
- **Vouches**: `/vouch @seller comment` (one per seller per user), `/vouches [@seller]` shows reputation.
- **Orders**: `/order-new @buyer item` (gets an order number), `/order-status <id> <pending|paid|delivered|cancelled>`, `/order-list`. Manage Server.
- **Wallet**: `/balance [@user]`, `/pay @user amount`, staff: `/wallet-give`, `/wallet-take`. Manage Server.
- **Levels**: XP for chatting (15-30 per message, 1 min cooldown). `/rank [@user]` level card, `/leaderboard` top 10.
- **Giveaways**: `/giveaway prize [winners] [minutes] [channel]` with Enter button, auto-draw, reroll button; survives restarts. Manage Server.
- **Welcome & auto-role**: `/welcome #channel [message]` with `{user}`, `{username}`, `{server}` placeholders; `/autorole @role`. Manage Server.

Runtime data is stored in `data/*.json` (gitignored, persists across restarts).

## Prefix commands

Every command also works with the `$` prefix, e.g. `$ping`, `$lock`, `$afk sleeping`.

- Arguments are positional: `$kick @user spamming chat`
- Use quotes for multi-word arguments: `$poll "Best game?" Minecraft Roblox`
- The last text argument (reason/message) takes everything remaining
- User/channel arguments accept mentions (`@user`, `#channel`) or IDs
- Server permissions are enforced the same way as the slash versions

## Hosting on bot-hosting.net

1. Create a new Node.js app and point it at this repo (or upload the files).
2. Set the start command to `npm start`.
3. Add `DISCORD_TOKEN` as an environment variable (or in the `.env` file) in the panel.
4. Start the app.

Never commit your token to the repo. Always keep it in environment variables.
