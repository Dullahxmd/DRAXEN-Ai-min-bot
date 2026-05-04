const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'tourl',
    description: 'Uploads media to Catbox and returns a link.',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message;
            const mime = (quoted?.imageMessage || quoted?.videoMessage || quoted?.audioMessage || quoted?.documentMessage)?.mimetype || '';

            if (!mime) {
                return socket.sendMessage(msg.key.remoteJid, { 
                    text: "Are you dense? Quote an image, video, or audio to get a link." + FOOTER 
                }, { quoted: fakeQuoted });
            }

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⌛', key: msg.key } });

            // Identify media type and download
            const mediaType = mime.split('/')[0];
            const messageKey = quoted?.imageMessage || quoted?.videoMessage || quoted?.audioMessage || quoted?.documentMessage;
            
            const stream = await downloadContentFromMessage(messageKey, mediaType === 'application' ? 'document' : mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (buffer.length > 256 * 1024 * 1024) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return socket.sendMessage(msg.key.remoteJid, { text: 'This file is fatter than your ego. 256MB limit.' + FOOTER }, { quoted: fakeQuoted });
            }

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', buffer, { 
                filename: `toxic_${Date.now()}.${mime.split('/')[1] || 'bin'}`,
                contentType: mime 
            });

            const response = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
            });

            if (!response.data || !response.data.includes('catbox')) {
                throw new Error('CATBOX REJECTED IT');
            }

            const link = response.data.trim();
            const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

            const resultText = `╭───(    \`𝐔𝐩𝐥𝐨𝐚𝐝 𝐒𝐮𝐜𝐜𝐞𝐬𝐬\`    )───
> 🔗 *𝐋𝐢𝐧𝐤:* ${link}
> 📦 *𝐒𝐢𝐳𝐞:* ${fileSizeMB} MB
╰──────────────────☉
*There’s your link. Don’t lose it, I’m not hosting it for you.*`;

            await socket.sendMessage(msg.key.remoteJid, {
                text: resultText + FOOTER
            }, { quoted: fakeQuoted });

        } catch (err) {
            console.error('Upload error:', err);
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(msg.key.remoteJid, { 
                text: `Upload failed. Even the server doesn't want your trash file.` + FOOTER 
            }, { quoted: fakeQuoted });
        }
    }
};
