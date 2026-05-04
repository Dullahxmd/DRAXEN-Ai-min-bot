const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'script',
    async execute(socket, msg) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const text = `*『 𝚃𝙾𝚇𝙸𝙲-𝙼𝙸𝙽𝙸-𝙱𝙾𝚃 𝚁𝙴𝙿𝙾 』*

╭───(    \`𝚂𝚢𝚜𝚝𝚎𝚖 𝙸𝚗𝚏𝚘\`    )───
> ───≫ 🔗 𝚁𝙴𝙿𝙾𝚂𝙸𝚃𝙾𝚁𝚈 ≫ <<───
> \`»\` 𝐎𝐰𝐧𝐞𝐫 : Dullah
> \`»\` 𝐋𝐢𝐧𝐤 : 
> \`»\` 𝐒𝐭𝐚𝐭𝐮𝐬 : Public/Stable
╰──────────────────☉

*Powered by Dullah*


> Draxen is fast`;

        await socket.sendMessage(msg.key.remoteJid, {
            text: text
        }, { quoted: fakeQuoted });
    }
};
