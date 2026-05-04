const googleTTS = require('google-tts-api');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'tts',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = msg.key.remoteJid;

        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const args = body.split(' ').slice(1).join(' ').trim();

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';

        const text = args || quotedText;

        if (!text) {
            return socket.sendMessage(from, {
                text: "Oh wow, you used .tts and gave me NOTHING. Genius level IQ right there. Either type something after the command or reply to a message, you absolute muppet." + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        await socket.sendMessage(from, { react: { text: '🔊', key: msg.key } });

        try {
            const url = googleTTS.getAudioUrl(text, {
                lang: 'en',
                slow: false,
                host: 'https://translate.google.com',
            });

            await socket.sendMessage(from, { react: { text: '✅', key: msg.key } });

            await socket.sendMessage(from, {
                audio: { url },
                mimetype: 'audio/mp4',
                ptt: false,
            }, { quoted: fakeQuoted });

        } catch (error) {
            await socket.sendMessage(from, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(from, {
                text: `TTS failed. Even Google doesn't want to speak your words. Fix your life.\nError: ${error.message}` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
