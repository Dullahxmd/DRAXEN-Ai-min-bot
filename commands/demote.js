const FOOTER = '\n\n> Draxen is fast';

const normalizeNum = (jid) => {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
};

const resolveTarget = (jid, participants) => {
    if (!jid) return null;
    const server = (jid.split('@')[1] || '').toLowerCase();
    const user = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!user) return null;
    if (server === 'lid') {
        const match = participants.find(p => (p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '') === user);
        if (match) return (match.jid || match.id).split(':')[0].split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net';
        return null;
    }
    const match = participants.find(p => {
        const pid = (p.jid || p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '');
        return pid === user || pid.endsWith(user) || user.endsWith(pid);
    });
    if (match) return (match.jid || match.id).split(':')[0].split('@')[0].replace(/\D/g, '') + '@s.whatsapp.net';
    return user + '@s.whatsapp.net';
};

module.exports = {
    name: 'demote',
    description: 'Demote an admin to regular member',
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
        const isAdmin = extras?.isAdmin || false;
        const isDev = extras?.isDev || false;
        const botNumber = extras?.botNumber || '';

        if (!isGroup) return socket.sendMessage(from, { text: '*This is a DM, not a group.*' + FOOTER }, { quoted: fakeQuoted });
        if (!isBotAdmin) return socket.sendMessage(from, { text: '*Make me admin first.*' + FOOTER }, { quoted: fakeQuoted });
        if (!isAdmin && !isDev) return socket.sendMessage(from, { text: '*Only admins can demote others.*' + FOOTER }, { quoted: fakeQuoted });

        const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
        const participants = metadata?.participants || [];

        let rawJid = null;
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.mentionedJid?.length > 0) rawJid = contextInfo.mentionedJid[0];
        else if (contextInfo?.quotedMessage && contextInfo?.participant) rawJid = contextInfo.participant;

        if (!rawJid) {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = body.split(' ').slice(1);
            if (args[0]) rawJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!rawJid) return socket.sendMessage(from, { text: '*Tag or reply to the admin you want to demote.*' + FOOTER }, { quoted: fakeQuoted });

        const targetJid = resolveTarget(rawJid, participants);
        if (!targetJid) return socket.sendMessage(from, { text: '*Could not find that user in this group.*' + FOOTER }, { quoted: fakeQuoted });

        const targetNum = targetJid.split('@')[0];
        const botNum = normalizeNum(botNumber);

        if (targetNum === botNum) return socket.sendMessage(from, { text: '*You want me to demote myself? Absolutely not.*' + FOOTER }, { quoted: fakeQuoted });

        const senderNum = normalizeNum(sender);

        try {
            await socket.groupParticipantsUpdate(from, [targetJid], 'demote');
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐃𝐞𝐦𝐨𝐭𝐞𝐝\`    )───\n> *𝐔𝐬𝐞𝐫:* @${targetNum}\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Demoted from Admin.\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*Back to being a nobody.*` + FOOTER,
                mentions: [targetJid, sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, { text: '*Failed to demote that user.*' + FOOTER }, { quoted: fakeQuoted });
        }
    }
};
