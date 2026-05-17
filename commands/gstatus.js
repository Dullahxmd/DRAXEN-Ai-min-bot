const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'gstatus',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {
        const { isGroup, from } = extras;
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};
        const botName = cfg.botName || 'DRAXEN-Ai';

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };

        if (!isGroup) {
            return socket.sendMessage(from, { text: `*This command is for groups only.*` + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }

        try {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || null;
            const messageToProcess = quoted ? quoted : msg.message;
            const type = Object.keys(messageToProcess)[0];
            const mime = messageToProcess[type]?.mimetype || '';

            const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || "");
            const caption = body.replace(new RegExp(`^\\${config.PREFIX}(gstatus|groupstatus|gs)\\s*`, 'i'), '').trim();

            const defaultCaption = `⚡ *Group Status Uploaded* ⚡\n_Via ${botName}_`;

            const downloadMedia = async (message, type) => {
                const stream = await downloadContentFromMessage(message, type.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer;
            };

            if (/image/.test(mime)) {
                const buffer = await downloadMedia(messageToProcess[type], 'image');
                await socket.sendMessage(from, { groupStatusMessage: { image: buffer, caption: caption || defaultCaption } });
            } else if (/video/.test(mime)) {
                const buffer = await downloadMedia(messageToProcess[type], 'video');
                await socket.sendMessage(from, { groupStatusMessage: { video: buffer, caption: caption || defaultCaption } });
            } else if (/audio/.test(mime)) {
                const buffer = await downloadMedia(messageToProcess[type], 'audio');
                await socket.sendMessage(from, { groupStatusMessage: { audio: buffer, mimetype: 'audio/mp4' } });
            } else if (caption) {
                await socket.sendMessage(from, { groupStatusMessage: { text: caption } });
            } else {
                return socket.sendMessage(from, { text: `*Reply to media or add text to post a status.*` + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
            }

            const successText = `*📡 ${botName} Sᴛᴀᴛᴜs Uᴘʟᴏᴀᴅ*

╭───(    \`DRAXEN-Ai STATS\`    )───
> ───≫ ⚡ Sᴛᴀᴛᴜs ⚡ <<<───
> \`»\` 𝐓𝐲𝐩𝐞 : ${mime ? mime.split('/')[0].toUpperCase() : 'TEXT'}
> \`»\` 𝐔𝐩𝐥𝐨𝐚𝐝 : SUCCESSFUL ✅
> \`»\` 𝐒𝐞𝐫𝐯𝐞𝐫 𝐓𝐢𝐦𝐞 : ${new Date().toLocaleString()}
╰──────────────────☉

*Status has been deployed to the group feed.*`;

            await socket.sendMessage(from, {
                text: successText + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });

        } catch (error) {
            await socket.sendMessage(from, { text: `*Error:* ${error.message}` + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }
    }
};
