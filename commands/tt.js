const axios = require('axios');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'tt',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo) {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const args = text.trim().split(/\s+/);
        const url = args[1];

        if (!url || !url.includes("tiktok.com")) {
            return socket.sendMessage(msg.key.remoteJid, {
                text: "Drop a valid TikTok link, you absolute potato. My time is more valuable than your search history." + FOOTER + PAIR_LINK
            }, { quoted: msg });
        }

        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};
        const botName = cfg.botName || 'DRAXEN-Ai';

        try {
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⌛', key: msg.key } });

            const { data } = await axios.get(`https://api.nexray.web.id/downloader/tiktok`, {
                params: { url: url }
            });

            if (!data.status || !data.result) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return socket.sendMessage(msg.key.remoteJid, { text: "TikTok is playing hard to get. The video might be private or the link is garbage." + FOOTER + PAIR_LINK }, { quoted: msg });
            }

            const res = data.result;
            const caption = `*『 𝚃𝙸𝙺𝚃𝙾𝙺 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳 』*

╭───(    \`𝚅𝚒𝚍𝚎𝚘 𝙳𝚎𝚝𝚊𝚒𝚕𝚜\`    )───
> ───≫ 📱 𝚃𝚒𝚔𝚃𝚘𝚔 ≫ <<───
> \`»\` 𝐀𝐮𝐭𝐡𝐨𝐫 : ${res.author?.nickname || 'Unknown'} (@${res.author?.unique_id || 'user'})
> \`»\` 𝐓𝐢𝐭𝐥𝐞 : ${res.title?.substring(0, 50) || 'No Title'}...
> \`»\` 𝐑𝐞𝐠𝐢𝐨𝐧 : ${res.region || 'Global'}
╰──────────────────☉

*Downloaded by ${botName}*`;

            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

            await socket.sendMessage(msg.key.remoteJid, {
                video: { url: res.data },
                caption: caption + FOOTER + PAIR_LINK
            }, { quoted: msg });

        } catch (error) {
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            await socket.sendMessage(msg.key.remoteJid, {
                text: "TikTok downloader crashed. Your link is probably as broken as your life choices." + FOOTER + PAIR_LINK
            }, { quoted: msg });
        }
    }
};
