const FOOTER = '\n\n> Draxen is fast';

const resolveTarget = (jid, participants) => {
    if (!jid) return null;
    const server = (jid.split('@')[1] || '').toLowerCase();
    const user = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!user) return null;
    if (server === 'lid') {
        const match = participants.find(p => (p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '') === user);
        if (match) return (match.jid || match.id).split(':')[0].split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net';
        return user + '@s.whatsapp.net';
    }
    const match = participants.find(p => {
        const pid = (p.jid || p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '');
        return pid === user || pid.endsWith(user) || user.endsWith(pid);
    });
    if (match) return (match.jid || match.id).split(':')[0].split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net';
    return user + '@s.whatsapp.net';
};

module.exports = {
    name: 'block',
    description: 'Block a user',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {
        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = extras?.from || msg.key.remoteJid;
        const isGroup = extras?.isGroup ?? from.endsWith('@g.us');
        const isOwner = extras?.isOwner || false;
        const isDev = extras?.isDev || false;

        if (!isOwner && !isDev) return socket.sendMessage(from, { text: '*Only the owner can block users.*' + FOOTER }, { quoted: fakeQuoted });

        let targetJid = null;

        if (isGroup) {
            const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
            const participants = metadata?.participants || [];
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            let rawJid = null;
            if (contextInfo?.participant) rawJid = contextInfo.participant;
            else if (contextInfo?.mentionedJid?.length > 0) rawJid = contextInfo.mentionedJid[0];
            if (rawJid) targetJid = resolveTarget(rawJid, participants);
        } else {
            targetJid = from;
        }

        if (!targetJid) return socket.sendMessage(from, { text: '*Tag or reply to the user you want to block.*' + FOOTER }, { quoted: fakeQuoted });

        try {
            await socket.updateBlockStatus(targetJid, 'block');
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐁𝐥𝐨𝐜𝐤𝐞𝐝\`    )───\n> *𝐔𝐬𝐞𝐫:* ${targetJid.split('@')[0]}\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Blocked.\n╰──────────────────☉\n\n*Goodbye. Don't come back.*` + FOOTER
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, { text: '*Failed to block that user.*' + FOOTER }, { quoted: fakeQuoted });
        }
    }
};
