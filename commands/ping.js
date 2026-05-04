const fs = require('fs');
const path = require('path');

const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'ping',
    description: 'Check bot latency',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};
        const botName = cfg.botName || 'DRAXEN-Ai';

        const latency = Date.now() - (msg.messageTimestamp * 1000 || Date.now());

        const text = `*📡 ${botName} Pɪɴɢ Nᴏᴡ*

╭───(    \`𝐓𝐨𝐱𝐢𝐜-𝐌𝐢𝐧𝐢 𝐒𝐭𝐚𝐭𝐬\`    )───
> ───≫ ⚡ Pɪɴɢ ⚡ <<───

*FREE MINI-BOT PAIR LINK*


> \`»\` 𝐋𝐚𝐭𝐞𝐧𝐜𝐲 : ${latency}ms
> \`»\` 𝐒𝐞𝐫𝐯𝐞𝐫 𝐓𝐢𝐦𝐞 : ${new Date().toLocaleString()}
╰──────────────────☉

*Took you long enough to check. I am faster than your brain anyway.*\n\n\n> Draxen is fast`;

await socket.sendMessage(msg.key.remoteJid, {
            text: text
        }, { quoted: fakeQuoted });
    }
};
