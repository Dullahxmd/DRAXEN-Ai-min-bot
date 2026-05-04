const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'rvo',
    description: 'Retrieve view-once media',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {
        try {
            const from = msg.key.remoteJid;

            const fakeQuoted = {
                key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
                message: { conversation: "Verified" },
                contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
            };

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quoted = contextInfo?.quotedMessage;

            if (!quoted) {
                return socket.sendMessage(from, {
                    text: "Reply to a view-once message, genius. How hard is that?" + FOOTER + PAIR_LINK
                }, { quoted: fakeQuoted });
            }

            const voMessage =
                quoted?.viewOnceMessageV2?.message ||
                quoted?.viewOnceMessageV2Extension?.message ||
                quoted?.viewOnceMessage?.message ||
                quoted;

            const imageMsg =
                voMessage?.imageMessage ||
                quoted?.imageMessage;

            const videoMsg =
                voMessage?.videoMessage ||
                quoted?.videoMessage;

            if (!imageMsg && !videoMsg) {
                return socket.sendMessage(from, {
                    text: "That's not a view-once message. Stop wasting my time." + FOOTER + PAIR_LINK
                }, { quoted: fakeQuoted });
            }

            await socket.sendMessage(from, { react: { text: '⌛', key: msg.key } });

            const mediaType = imageMsg ? 'image' : 'video';
            const mediaContent = imageMsg || videoMsg;

            if (!mediaContent.directPath && !mediaContent.url) {
                return socket.sendMessage(from, {
                    text: "I can see the message but can't download it. iOS might have already expired it." + FOOTER + PAIR_LINK
                }, { quoted: fakeQuoted });
            }

            const stream = await downloadContentFromMessage(mediaContent, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await socket.sendMessage(from, { react: { text: '✅', key: msg.key } });

            const caption = `🥀\n—\n*DRAXEN-Ai*\n\n> Imagine trying to hide this from me. Pathetic.` + FOOTER + PAIR_LINK;

            if (imageMsg) {
                await socket.sendMessage(from, { image: buffer, caption }, { quoted: fakeQuoted });
            } else {
                await socket.sendMessage(from, { video: buffer, caption }, { quoted: fakeQuoted });
            }

        } catch (error) {
            await socket.sendMessage(msg.key.remoteJid, {
                text: "Couldn't grab it. The media probably expired or iOS is being a pain." + FOOTER + PAIR_LINK
            });
        }
    }
};
