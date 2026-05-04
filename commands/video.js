const yts = require("yt-search");
const axios = require("axios");

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'video',
    description: 'Downloads videos from YouTube',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        try {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const text = body.split(' ').slice(1).join(' ').trim();

            if (!text) {
                return socket.sendMessage(msg.key.remoteJid, {
                    text: "Are you mute? Give me a video name." + FOOTER + PAIR_LINK
                }, { quoted: fakeQuoted });
            }

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⌛', key: msg.key } });

            const searchResult = await yts(`${text} official`);
            const video = searchResult.videos[0];

            if (!video) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return socket.sendMessage(msg.key.remoteJid, { text: `Nothing found. Your taste is nonexistent.` + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
            }

            const { data } = await axios.get(`https://api.ootaizumi.web.id/downloader/youtube?url=${encodeURIComponent(video.url)}&format=720`);

            if (!data.status || !data.result?.download) throw new Error('API Fail');

            const title = data.result.title || "Untitled";
            const videoUrl = data.result.download;

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

            await socket.sendMessage(msg.key.remoteJid, {
                video: { url: videoUrl },
                mimetype: "video/mp4",
                fileName: `${title}.mp4`,
                caption: `🎬 *${title}*\n—\n*Draxen-ai*` + FOOTER + PAIR_LINK,
            }, { quoted: fakeQuoted });

        } catch (error) {
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(msg.key.remoteJid, { text: `Download failed. The universe despises your choice.` + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }
    }
};
