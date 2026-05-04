# DRAXEN-Ai 🪽

A multi-user WhatsApp bot built on [Baileys](https://github.com/WhiskeySockets/Baileys) that lets multiple people connect their own WhatsApp numbers to a single hosted server. Each user runs their own independent bot session — same server, different numbers, no interference.

Built and maintained by **Dullah** — []()

---

## What is this exactly?

Most WhatsApp bots are single-number setups — you clone the repo, scan a QR code, done. This one is different.

DRAXEN-Ai is designed to host **many users at once**. Someone visits your site, enters their number, gets a pairing code, connects their WhatsApp — and their bot is live. Their session is saved to a PostgreSQL database so even if the server restarts, their bot comes back online automatically.

It handles up to 150+ concurrent sessions, each with their own command prefix, their own language preference, their own config. One server, many bots.

---

## Stack

- **Runtime:** Node.js 22.x
- **WhatsApp:** Baileys (via `toxic-baileys` fork)
- **Server:** Express.js
- **Database:** PostgreSQL (Heroku Postgres or any Postgres provider)
- **Translation:** `@vitalets/google-translate-api` (free, no key needed)
- **TTS:** `google-tts-api` (free, no key needed)
- **STT:** Groq Whisper API (free tier at console.groq.com)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/xhclintohn/toxic-mini-bot.git
cd toxic-mini-bot
npm install
```

### 2. Environment variables

Create a `.env` file or set these in your hosting platform:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
OWNER_NUMBER=255716945971
GROQ_API_KEY=your_groq_key_here
PORT=8000
```

- `DATABASE_URL` — Your Postgres connection string. On Heroku, this is set automatically when you attach the Heroku Postgres addon.
- `OWNER_NUMBER` — Your WhatsApp number with country code, no `+`. Used for owner-only commands.
- `GROQ_API_KEY` — Free at [console.groq.com](https://console.groq.com). Only needed if you use the `.stt` (speech-to-text) command.

### 3. Set up the database

The bot will create its own tables on first run. You don't need to run any migrations manually — just make sure `DATABASE_URL` is set and the database is reachable.

Tables it creates:
- `sessions` — Stores WhatsApp credentials per number
- `numbers` — Tracks which numbers have connected
- `configs` — Per-user settings (language preference, bot name, logo)
- `welcome_sent` — Tracks whether the welcome message was sent
- `start_sent` — Internal flag for startup messages

### 4. Start the bot

```bash
npm start
```

The server starts on port `8000` by default (or whatever `PORT` is set to). Visit `http://localhost:8000` to see the pairing page.

---

## How users connect

1. User visits your hosted URL
2. Enters their WhatsApp number (with country code, no `+`)
3. Gets a pairing code
4. Opens WhatsApp → Settings → Linked Devices → Link a Device → enters the code
5. Bot is live. Welcome message sent automatically.

Or they can use the `.pair` command inside an already-connected bot session to generate a code for another number.

---

## Command system

Commands live in the `commands/` folder. Each file is a command. The bot loads every `.js` file in that folder automatically — no registration needed, just drop the file in and restart.

### Command structure

Every command follows this exact pattern:

```js
module.exports = {
    name: 'commandname',
    async execute(socket, msg, number, config, loadUserConfig, activeSockets, socketCreationTime, extras) {
        // your code here
    }
};
```

That's it. Save the file, restart the bot, the command is live.

### Parameters explained

| Parameter | What it is |
|-----------|-----------|
| `socket` | The Baileys socket for this user's session. Use this to send messages, react, download media, etc. |
| `msg` | The full incoming message object from WhatsApp |
| `number` | The bot owner's number (sanitized, digits only) |
| `config` | Global bot config object (prefixes, owner number, bot name, etc.) |
| `loadUserConfig` | Async function — call it with a number to get that user's saved settings from Postgres |
| `activeSockets` | Map of all currently active sessions (`number → socket`) |
| `socketCreationTime` | Map of when each session came online (`number → timestamp`) — useful for uptime |
| `extras` | Object with extra context: `{ isGroup, from, sender, groupMetadata, prefix, isBotAdmin, isAdmin, botNumber, decodedSender }` |

### How to extract the message body

```js
const body = msg.message?.conversation 
    || msg.message?.extendedTextMessage?.text 
    || '';
```

### How to get command arguments

```js
const args = body.split(' ').slice(1).join(' ').trim();
// if user sent ".play Blinding Lights", args = "Blinding Lights"
```

### How to send a reply

```js
// Simple text reply
await socket.sendMessage(msg.key.remoteJid, {
    text: 'Your response here'
}, { quoted: msg });
```

### How to use fakeQuoted (for iOS compatibility)

iOS doesn't render the WhatsApp `externalAdReply` banner properly. Instead of using `contextInfo: { externalAdReply: {...} }`, use this pattern to make messages look quoted without breaking on iPhone:

```js
const fakeQuoted = {
    key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
    message: { conversation: "Verified" },
    contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
};

await socket.sendMessage(msg.key.remoteJid, {
    text: 'Your response here'
}, { quoted: fakeQuoted });
```

This works on both Android and iOS.

### Full example command

Here's a simple `.greet` command that says hello and tells you if you're in a group or DM:

```js
const FOOTER = '\n\n\n> 𝐩𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐃𝐮𝐥𝐥𝐚𝐡';

module.exports = {
    name: 'greet',
    async execute(socket, msg, number, config, loadUserConfig, activeSockets, socketCreationTime, extras) {
        const from = extras?.from || msg.key.remoteJid;
        const isGroup = extras?.isGroup || false;
        const sender = extras?.sender || from;
        const senderNumber = sender.split('@')[0];

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };

        const location = isGroup ? 'a group chat' : 'a private chat';

        await socket.sendMessage(from, {
            text: `Hey @${senderNumber} 👋\nYou said hi from ${location}.\n\nNot sure why you needed a bot for that, but here we are.` + FOOTER,
            mentions: [sender]
        }, { quoted: fakeQuoted });
    }
};
```

Save this as `commands/greet.js`, restart — users can now type `.greet` (or `,greet`, `!greet`, any prefix).

### Creating aliases (multiple names for one command)

Just create a new file that re-exports the original:

```js
// commands/hi.js
module.exports = require('./greet');
```

Now `.hi` does the same thing as `.greet`. Simple.

### Loading user config

If you need the user's saved preferences (like their bot name or language):

```js
const sanitized = (number || '').replace(/[^0-9]/g, '');
const cfg = await loadUserConfig(sanitized) || {};
const botName = cfg.botName || 'DRAXEN-Ai';
const logo = cfg.logo || 'https://your-default-image.png';
```

### Handling group-only commands

```js
if (!extras?.isGroup) {
    return socket.sendMessage(from, {
        text: 'This command only works in groups.'
    }, { quoted: msg });
}
```

### Handling admin-only commands

```js
if (!extras?.isAdmin) {
    return socket.sendMessage(from, {
        text: 'You need to be an admin to use this.'
    }, { quoted: msg });
}

if (!extras?.isBotAdmin) {
    return socket.sendMessage(from, {
        text: 'I need admin rights to do that.'
    }, { quoted: msg });
}
```

---

## API Routes

The bot exposes an HTTP API at `/code/...`. All routes are accessible by anyone who has the server URL — if you want to lock them down, add your own auth middleware.

### Public routes

These are meant for end users or your frontend:

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/code/?number=254712345678` | Generates a pairing code for the given number. This is what the frontend calls when a user wants to connect. |
| `GET` | `/code/ping` | Health check. Returns server status, active bot count, and memory usage. |

### Admin routes

These are for managing sessions. Protect these if your bot is public-facing.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/code/api/sessions` | Returns a list of all sessions stored in the database, with their numbers and last-updated timestamps. |
| `GET` | `/code/api/active` | Returns only the sessions currently active in memory (connected right now). |
| `GET` | `/code/connect-all` | Reconnects every session from the database in batches. Use this after a server restart if the watchdog hasn't kicked in yet. |
| `GET` | `/code/reconnect` | Gracefully restarts all currently active sessions in batches. Useful if something is acting weird. |
| `GET` | `/code/force-reconnect?number=254712345678` | Force-reconnects a specific number. Kills the session, clears local files, reconnects fresh. |
| `POST` | `/code/api/session/delete` | Deletes a specific session. Body: `{ "number": "254712345678" }` |
| `POST` | `/code/api/terminate-all` | Kills every active session and wipes all sessions from the database. Nuclear option. |
| `POST` | `/code/api/cleanup` | Runs the cleanup job manually — removes stale temp files and orphaned database records. |

---

## How reconnection works

The bot is built to stay online without you babysitting it.

When a connection closes, the bot checks the disconnect reason:

- **`loggedOut`** — The user logged out on their phone. Session is deleted permanently. Nothing to reconnect.
- **Everything else** — Network blip, WhatsApp server hiccup, timeout, whatever. The bot waits and retries with exponential backoff: 5s, 7s, 10s, 15s... capped at 60 seconds. It retries forever until it gets back online.

On top of that, there's a **watchdog** that runs every 3 minutes. It checks every session in the database and if any of them aren't in the active connections map, it revives them automatically. So even if a session drops without triggering a close event (rare but it happens), the watchdog catches it.

---

## Translation

Users can set their language with `.setlang fr` (or any supported language code). Once set, the bot automatically translates all its responses into their chosen language. No extra work needed in individual commands — the translation layer sits inside `core.js` and intercepts `socket.sendMessage` calls transparently.

Supported languages: `en`, `fr`, `es`, `de`, `pt`, `ar`, `hi`, `zh`, `ru`, `sw`, `ja`, `ko`, `it`, `nl`, `id`

---

## iOS compatibility note

All commands in this bot use `fakeQuoted` instead of WhatsApp's `externalAdReply` contextInfo banner. The banner works fine on Android but breaks message delivery on iOS. The `fakeQuoted` approach gives the same visual "replied to" style and works on both platforms.

If you're writing new commands, always use the `fakeQuoted` pattern shown above. Don't use `contextInfo: { externalAdReply: {...} }`.

---

## Project structure

```
├── index.js          # Express server entry point
├── core.js           # Main bot engine — sessions, connections, command routing, API routes
├── commands/         # All command files live here
│   ├── index.js      # Auto-loads all commands from this folder
│   ├── alive.js      # Example: .alive command
│   ├── ping.js       # Example: .ping command
│   └── ...           # Add your own here
├── translate.js      # Reusable translation utility
├── manager.js        # Telegram bot manager (optional integration)
├── newsletter.js     # Newsletter/channel reaction handler
├── config.js         # Bot configuration
├── main.html         # Frontend pairing page
└── package.json
```

---

## Prefixes

The bot responds to any of these prefixes by default: `. , ! / # $ & + = ? @ ~`

So `.menu`, `,menu`, `!menu` all work. You can change this in `config.js`.

---

## Contributing

Drop your commands in the `commands/` folder following the structure above. Keep the `fakeQuoted` pattern. Don't hardcode numbers. Test on both Android and iOS before submitting.

---

## License

MIT — do what you want, just don't remove the credits.

Made with questionable life choices by [Dullah](https://wa.me/254114885159)
