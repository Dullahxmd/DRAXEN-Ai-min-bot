const axios = require('axios');

const FOOTER = '\n\n> Draxen ai is fast';

module.exports = {
    name: 'ai',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {
        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const prompt = text.split(' ').slice(1).join(' ').trim();

        if (!prompt) {
return socket.sendMessage(msg.key.remoteJid, { 
                text: "Where is your prompt? You managed to type the command but forgot the question. Amazing." + FOOTER 
            }, { quoted: fakeQuoted });
        }

        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};

        try {
            const apiUrl = `https://api.deline.web.id/ai/openai`;

            const { data } = await axios.get(apiUrl, {
                params: {
                    text: prompt,
                    prompt: "You are DRAXEN-Ai created by Dullah and your replies must always be toxic"
                }
            });

            if (!data.status || !data.result) {
                throw new Error('API returned garbage');
            }

            const botName = cfg.botName || 'DRAXEN-Ai';

const messageText = `*[ DRAXEN-AI RESPONSE ]*\n\n${data.result}\n\n—\n${botName} • GPT-4O\n\n\n> Draxen is fast\n\n*Free MiniBot Pair*: https://dullahxmd-v2.vercel.app/`;

            await socket.sendMessage(msg.key.remoteJid, {
                text: messageText
            }, { quoted: fakeQuoted });

        } catch (error) {
            console.error('GPT Error:', error);

await socket.sendMessage(msg.key.remoteJid, { 
                text: "AI failed. Maybe your question was too stupid even for AI." + FOOTER 
            }, { quoted: fakeQuoted });
        }
    }
};