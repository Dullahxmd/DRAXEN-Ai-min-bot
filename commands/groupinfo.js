const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'groupinfo',
    description: 'Show group information',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = extras?.from || msg.key.remoteJid;
        const isGroup = extras?.isGroup ?? from.endsWith('@g.us');
        const isBotAdmin = extras?.isBotAdmin || false;

        if (!isGroup) {
            return socket.sendMessage(from, {
                text: '*There is no group info in a DM. Obviously.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        try {
            const metadata = extras?.groupMetadata || await socket.groupMetadata(from);
            const admins = metadata.participants.filter(p => p.admin !== null);
            const owner = metadata.participants.find(p => p.admin === 'superadmin');

            const adminList = admins.map(a => {
                const pJid = a.jid || a.id;
                return `> @${pJid.split('@')[0].split(':')[0]}`;
            }).join('\n');

            const ownerJid = owner ? (owner.jid || owner.id) : null;

            const text = `╭───(    \`𝐆𝐫𝐨𝐮𝐩 𝐈𝐧𝐟𝐨\`    )───
> \`»\` 𝐍𝐚𝐦𝐞 : ${metadata.subject}
> \`»\` 𝐈𝐃 : ${from}
> \`»\` 𝐌𝐞𝐦𝐛𝐞𝐫𝐬 : ${metadata.participants.length}
> \`»\` 𝐀𝐝𝐦𝐢𝐧𝐬 : ${admins.length}
> \`»\` 𝐎𝐰𝐧𝐞𝐫 : ${ownerJid ? '@' + ownerJid.split('@')[0].split(':')[0] : 'Unknown'}
> \`»\` 𝐁𝐨𝐭 𝐀𝐝𝐦𝐢𝐧 : ${isBotAdmin ? 'Yes' : 'No'}
> \`»\` 𝐃𝐞𝐬𝐜 : ${metadata.desc || 'No description'}
╰──────────────────☉

╭───(    \`𝐀𝐝𝐦𝐢𝐧 𝐋𝐢𝐬𝐭\`    )───
${adminList}
╰──────────────────☉

*There you go. Now you know everything about this place. Happy?*` + FOOTER + PAIR_LINK;

            const mentions = admins.map(a => a.jid || a.id);
            if (ownerJid) mentions.push(ownerJid);

            await socket.sendMessage(from, { text, mentions }, { quoted: fakeQuoted });

        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to get group info. The group is hiding its secrets from me.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
