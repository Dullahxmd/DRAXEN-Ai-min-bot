const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'owner',
    description: 'Show owner info',
    async execute(socket, msg, number) {
        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
const text = `*👑 𝐎𝐖𝐍𝐄𝐑 𝐈𝐍𝐅𝐎 👑*

╭───(    \`𝐎𝐰𝐧𝐞𝐫 𝐃𝐞𝐭𝐚𝐢𝐥𝐬\`    )───
> ───≫ 👑 INFO 👑 <<───
> \`»\` 𝐍𝐚𝐦𝐞 : dullah
> \`»\` WhatsApp : https://wa.me/255716945971
> \`»\` 𝐑𝐨𝐥𝐞  : 𝐁𝐨𝐭 𝐂𝐫𝐞𝐚𝐭𝐨𝐫
╰──────────────────☉
*Contact for support if you must*\n\n\n> Draxen is fast`;

        const buttons = [
            { buttonId: `${global.config.PREFIX || '.'}menu`, buttonText: { displayText: "📜 ᴍᴇɴᴜ" }, type: 1 },
        ];

        await socket.sendMessage(msg.key.remoteJid, {
            text,
            footer: "👑 𝘖𝘸𝘯𝘦𝘳 𝘐𝘯𝘧𝘰𝘳𝘮𝘢𝘵𝘪𝘰𝘯",
            buttons
        }, { quoted: fakeQuoted });
    }
};