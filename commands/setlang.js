const { translate } = require('@vitalets/google-translate-api');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

const SUPPORTED = {
    en: 'English', fr: 'French', french: 'French', es: 'Spanish', de: 'German',
    pt: 'Portuguese', ar: 'Arabic', hi: 'Hindi', zh: 'Chinese',
    ru: 'Russian', sw: 'Swahili', ja: 'Japanese', ko: 'Korean',
    it: 'Italian', nl: 'Dutch', id: 'Indonesian',
};

module.exports = {
    name: 'setlang',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = extras?.from || msg.key.remoteJid;
        const sanitized = (number || '').replace(/[^0-9]/g, '');

        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const lang = body.split(' ').slice(1).join(' ').trim().toLowerCase();

        if (!lang) {
            const list = Object.entries(SUPPORTED).map(([code, name]) => `> \`»\` ${code} — ${name}`).join('\n');
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐋𝐚𝐧𝐠𝐮𝐚𝐠𝐞\`    )───\n> ───≫ 🌐 SUPPORTED ≪───\n${list}\n╰──────────────────☉\n\n*Usage: .setlang fr*\n*Stop staring and just pick one.*` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        if (!SUPPORTED[lang]) {
            return socket.sendMessage(from, {
                text: `*"${lang}" is not a supported language code. Use .setlang to see the full list, genius.*` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        try {
            const { Pool } = require('pg');
            const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

            const existing = await pgPool.query('SELECT config FROM configs WHERE number = $1', [sanitized]);
            const currentConfig = existing.rows.length > 0 ? existing.rows[0].config : {};
            const newConfig = { ...currentConfig, lang };

            await pgPool.query(
                `INSERT INTO configs (number, config, updated_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (number)
                 DO UPDATE SET config = $2, updated_at = CURRENT_TIMESTAMP`,
                [sanitized, JSON.stringify(newConfig)]
            );

            await pgPool.end();

            const confirmation = lang !== 'en'
                ? await translate(`Language set to ${SUPPORTED[lang]}. All responses will now be in ${SUPPORTED[lang]}.`, { to: lang }).then(r => r.text).catch(() => '')
                : '';

            await socket.sendMessage(from, {
                text: `╭───(    \`𝐋𝐚𝐧𝐠𝐮𝐚𝐠𝐞\`    )───\n> ───≫ ✅ UPDATED ≪───\n> \`»\` 𝐋𝐚𝐧𝐠𝐮𝐚𝐠𝐞 : ${SUPPORTED[lang]}\n> \`»\` 𝐂𝐨𝐝𝐞 : ${lang}\n> \`»\` 𝐒𝐭𝐚𝐭𝐮𝐬 : Active\n╰──────────────────☉\n\n*All responses will now be in ${SUPPORTED[lang]}.*${confirmation ? '\n' + confirmation : ''}` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });

        } catch (error) {
            await socket.sendMessage(from, {
                text: `*Failed to save language. The database is throwing a tantrum.\nError: ${error.message}*` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
