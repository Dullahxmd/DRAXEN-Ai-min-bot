const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs').promises;
const path = require('path');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'sticker',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = msg.key.remoteJid;
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};
        const botName = cfg.botName || 'DRAXEN-Ai';

        await socket.sendMessage(from, { react: { text: '🔃', key: msg.key } });

        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            let mediaMessage = null;
            let mediaType = null;

            if (msg.message?.imageMessage) {
                mediaMessage = msg.message.imageMessage;
                mediaType = 'image';
            } else if (msg.message?.videoMessage) {
                mediaMessage = msg.message.videoMessage;
                mediaType = 'video';
            } else if (quoted?.imageMessage) {
                mediaMessage = quoted.imageMessage;
                mediaType = 'image';
            } else if (quoted?.videoMessage) {
                mediaMessage = quoted.videoMessage;
                mediaType = 'video';
            } else if (quoted?.stickerMessage) {
                mediaMessage = quoted.stickerMessage;
                mediaType = 'sticker';
            }

            if (!mediaMessage) {
                await socket.sendMessage(from, { react: { text: '❌', key: msg.key } });
                return socket.sendMessage(from, {
                    text: 'Send or reply to an image or short video, genius. I can\'t make a sticker out of thin air.' + FOOTER + PAIR_LINK
                }, { quoted: fakeQuoted });
            }

            if (mediaType === 'video' && mediaMessage.seconds > 30) {
                await socket.sendMessage(from, { react: { text: '❌', key: msg.key } });
                return socket.sendMessage(from, {
                    text: 'That video is too long. Keep it under 30 seconds or learn to trim your content.' + FOOTER + PAIR_LINK
                }, { quoted: fakeQuoted });
            }

            const dlType = mediaType === 'sticker' ? 'sticker' : mediaType;
            const stream = await downloadContentFromMessage(mediaMessage, dlType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tempFile = path.join(__dirname, `temp-sticker-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'webp'}`);
            await fs.writeFile(tempFile, buffer);

            const sticker = new Sticker(tempFile, {
                pack: botName,
                author: 'dullah [dev]',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 50,
                background: 'transparent'
            });

            const stickerBuffer = await sticker.toBuffer();

            await socket.sendMessage(from, { react: { text: '✅', key: msg.key } });
            await socket.sendMessage(from, { sticker: stickerBuffer }, { quoted: fakeQuoted });

            await fs.unlink(tempFile).catch(() => {});

        } catch (error) {
            await socket.sendMessage(from, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(from, {
                text: 'Sticker creation flopped. Either the file is corrupted or the universe hates you. Try again.' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
