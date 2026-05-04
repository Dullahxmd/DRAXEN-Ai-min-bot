const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'alive',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};
        const botName = cfg.botName || 'DRAXEN-Ai';

        const statusText = `*[• DRAXEN-Ai STATUS •]*

╭───(    \`𝚂𝚢𝚜𝚝𝚎𝚖 𝙰𝚕𝚒𝚟𝚎\`    )───
> ───≫ 𝚂𝚃𝙰𝚃𝚄𝚂 : Online
> \`»\` 𝐁𝐨𝐭 𝐍𝐚𝐦𝐞 : ${botName}
> \`»\` 𝐎𝐰𝐧𝐞𝐫 : Dullah
> \`»\` 𝐌𝐞𝐦𝐨𝐫𝐲 : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
╰──────────────────☉

*Yeah I'm alive, unlike your social life. Stop checking on me and do something productive for once.*`;

        await socket.sendMessage(msg.key.remoteJid, {
            text: statusText + FOOTER + PAIR_LINK
        }, { quoted: fakeQuoted });
    }
};
