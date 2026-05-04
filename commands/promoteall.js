const FOOTER = '\n\n> Draxen is fast';

const normalizeNum = (jid) => {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '');
};

const toWAJid = (jid) => {
    if (!jid) return null;
    const num = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!num) return null;
    return num + '@s.whatsapp.net';
};

module.exports = {
    name: 'promoteall',
    description: 'Promote all members to admin',
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

        if (!isGroup) return socket.sendMessage(from, { text: '*This command only works in groups.*' + FOOTER }, { quoted: fakeQuoted });
        if (!isBotAdmin) return socket.sendMessage(from, { text: '*Make me admin first before I can promote anyone.*' + FOOTER }, { quoted: fakeQuoted });
        if (!isAdmin && !isDev) return socket.sendMessage(from, { text: '*Only admins can use promoteall.*' + FOOTER }, { quoted: fakeQuoted });

        const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
        if (!metadata) return socket.sendMessage(from, { text: '*Could not fetch group info.*' + FOOTER }, { quoted: fakeQuoted });

        const participants = metadata.participants || [];
        const botNum = normalizeNum(botNumber);

        const toPromote = participants
            .filter(p => !p.admin)
            .map(p => toWAJid(p.jid || p.id))
            .filter(Boolean)
            .filter(j => normalizeNum(j) !== botNum);

        if (toPromote.length === 0) {
            return socket.sendMessage(from, { text: '*Everyone is already an admin. Nothing to do.*' + FOOTER }, { quoted: fakeQuoted });
        }

        let promoted = 0;
        let failed = 0;

        for (let i = 0; i < toPromote.length; i += 5) {
            const batch = toPromote.slice(i, i + 5);
            try {
                await socket.groupParticipantsUpdate(from, batch, 'promote');
                promoted += batch.length;
            } catch {
                failed += batch.length;
            }
        }

        const senderNum = normalizeNum(sender);

        await socket.sendMessage(from, {
            text: [
                `╭───(    \`𝐏𝐫𝐨𝐦𝐨𝐭𝐞 𝐀𝐥𝐥\`    )───`,
                `> *𝐁𝐲:* @${senderNum}`,
                `> *𝐏𝐫𝐨𝐦𝐨𝐭𝐞𝐝:* ${promoted} member(s)`,
                failed > 0 ? `> *𝐅𝐚𝐢𝐥𝐞𝐝:* ${failed} member(s)` : null,
                `╰──────────────────☉`,
                ``,
                `*Everyone is an admin now. Good luck.*`
            ].filter(l => l !== null).join('\n') + FOOTER,
            mentions: [sender, ...toPromote]
        }, { quoted: fakeQuoted });
    }
};
