const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'save',
    async execute(socket, msg) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const remoteJid = msg.key.remoteJid;

        if (!quoted) return socket.sendMessage(remoteJid, { text: "Reply to a status first, you absolute potato." + FOOTER });

        // Identify the type of media in the status
        const type = Object.keys(quoted)[0];
        const mediaMsg = quoted[type];

        if (!mediaMsg || !mediaMsg.directPath) {
            return socket.sendMessage(remoteJid, { text: "This isn't a status media I can grab." + FOOTER });
        }

        try {
            // Download the media from WhatsApp's servers
            const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Send it back to you
            const caption = mediaMsg.caption || "Saved by DRAXEN-Ai";
            const messageConfig = {};
            
            if (type === 'imageMessage') messageConfig.image = buffer;
            else if (type === 'videoMessage') messageConfig.video = buffer;
            else messageConfig.document = buffer; // Fallback for other files

            messageConfig.caption = caption + FOOTER;

            await socket.sendMessage(remoteJid, messageConfig, { quoted: fakeQuoted });
        } catch (e) {
            console.error(e);
            await socket.sendMessage(remoteJid, { text: "Failed to grab media. The status is being stubborn." + FOOTER });
        }
    }
};
