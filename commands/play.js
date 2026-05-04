const axios = require('axios');

const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'play',
    description: 'Downloads songs from YouTube and sends audio',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        try {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const query = body.split(' ').slice(1).join(' ').trim();

            if (!query) {
                return socket.sendMessage(msg.key.remoteJid, { 
                    text: "Give me a song name, you tone-deaf cretin. I can't play silence." + FOOTER 
                }, { quoted: fakeQuoted });
            }

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⌛', key: msg.key } });

            let data;
            let audioUrl;
            let filename;
            let success = false;

            const apis = [
                { url: `https://api.deline.web.id/downloader/ytplay?q=${encodeURIComponent(query)}`, format: (res) => ({ url: res.result?.dlink, title: res.result?.title }) },
                { url: `https://api.nexray.web.id/downloader/ytplay?q=${encodeURIComponent(query)}`, format: (res) => ({ url: res.result?.download_url, title: res.result?.title }) }
            ];

            for (const api of apis) {
                try {
                    const response = await axios.get(api.url);
                    const formatted = api.format(response.data);
                    if (response.data.status && formatted.url) {
                        data = response.data;
                        audioUrl = formatted.url;
                        filename = formatted.title || "Unknown Song";
                        success = true;
                        break;
                    }
                } catch (err) {
                    continue;
                }
            }

            if (!success || !audioUrl) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return socket.sendMessage(msg.key.remoteJid, { 
                    text: `No song found for "${query}". Your music taste is as bad as your search skills.` + FOOTER 
                }, { quoted: fakeQuoted });
            }

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

            await socket.sendMessage(msg.key.remoteJid, {
                audio: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${filename}.mp3`,

            }, { quoted: fakeQuoted });

            await socket.sendMessage(msg.key.remoteJid, {
                document: { url: audioUrl },
                mimetype: "audio/mpeg",
                fileName: `${filename.replace(/[<>:"/\\|?*]/g, '_')}.mp3`,
                caption: `🎵 *${filename}*\n—\n*DRAXEN-Ai*\n\n\n> Draxen is fast`
            }, { quoted: fakeQuoted });

        } catch (error) {
            console.error('YouTube error:', error);
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(msg.key.remoteJid, { 
                text: `YouTube download failed. The universe rejects your music taste.\nError: ${error.message}` + FOOTER 
            }, { quoted: fakeQuoted });
        }
    }
};