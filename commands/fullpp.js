const { jidNormalizedUser, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const FOOTER = '\n\n> Draxen is fast';

async function generateProfilePicture(imageBuffer) {
    const sharp = require('sharp');
    
    const { data, info } = await sharp(imageBuffer)
        .resize(640, 640, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .jpeg({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
    
    return { img: data };
}

module.exports = {
    name: 'fullpp',
    async execute(socket, msg, number) {
        const owner = '254114885159';
        const botJid = jidNormalizedUser(socket.user.id);
        if (number !== owner && number !== botJid.split('@')[0]) return;

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || !quoted.imageMessage) return socket.sendMessage(msg.key.remoteJid, { text: "Reply to an image, genius. How hard is that?" + FOOTER });

        try {
            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            const { img } = await generateProfilePicture(buffer);

            await socket.query({
                tag: 'iq',
                attrs: {
                    to: '@s.whatsapp.net',
                    type: 'set',
                    xmlns: 'w:profile:picture'
                },
                content: [
                    {
                        tag: 'picture',
                        attrs: { type: 'image' },
                        content: img
                    }
                ]
            });

            await socket.sendMessage(msg.key.remoteJid, { text: "✅ *Profile Picture Updated. Looking dangerous.* Now admire it and stop bothering me." + FOOTER });
        } catch (e) {
            await socket.sendMessage(msg.key.remoteJid, { text: `Error: ${e.message}` + FOOTER });
        }
    }
};