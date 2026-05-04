const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

const DEV_NUMBER = '255716945971';

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
    name: 'promote',
    description: 'Promote a member to admin',
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

        if (!isGroup) return socket.sendMessage(from, { text: '*Promote who? This is not a group chat, Einstein.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        if (!isBotAdmin) return socket.sendMessage(from, { text: '*Make me admin first before asking me to promote anyone.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        if (!isAdmin && !isDev) return socket.sendMessage(from, { text: '*You are not an admin. Stop pretending to have power.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

        const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
        const participants = metadata?.participants || [];

        let rawJid = null;
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (contextInfo?.participant) rawJid = contextInfo.participant;
        else if (contextInfo?.mentionedJid?.length > 0) rawJid = contextInfo.mentionedJid[0];

        if (!rawJid) {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = body.split(' ').slice(1);
            if (args[0]) rawJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (!rawJid) return socket.sendMessage(from, { text: '*Tag or reply to the user you want to promote.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

        const targetJid = resolveTarget(rawJid, participants);
        if (!targetJid) return socket.sendMessage(from, { text: '*Could not find that user in this group.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

        const targetNum = targetJid.split('@')[0];
        const senderNum = normalizeNum(sender);

        try {
            await socket.groupParticipantsUpdate(from, [targetJid], 'promote');
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝\`    )───\n> *𝐔𝐬𝐞𝐫:* @${targetNum}\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Promoted to Admin.\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*Congratulations, you now have power.*` + FOOTER + PAIR_LINK,
                mentions: [targetJid, sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, { text: '*Failed to promote that user.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }
    }
};
