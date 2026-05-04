const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

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
    name: 'demoteall',
    description: 'Demote all admins to regular members',
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

        if (!isGroup) return socket.sendMessage(from, { text: '*This command only works in groups.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        if (!isBotAdmin) return socket.sendMessage(from, { text: '*Make me admin first before I can demote anyone.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        if (!isAdmin && !isDev) return socket.sendMessage(from, { text: '*Only admins can use demoteall.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

        const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
        if (!metadata) return socket.sendMessage(from, { text: '*Could not fetch group info.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

        const participants = metadata.participants || [];
        const botNum = normalizeNum(botNumber);

        const toDemote = participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => toWAJid(p.jid || p.id))
            .filter(Boolean)
            .filter(j => normalizeNum(j) !== botNum);

        if (toDemote.length === 0) {
            return socket.sendMessage(from, { text: '*No admins to demote. Already a flat hierarchy.*' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }

        let demoted = 0;
        let failed = 0;

        for (let i = 0; i < toDemote.length; i += 5) {
            const batch = toDemote.slice(i, i + 5);
            try {
                await socket.groupParticipantsUpdate(from, batch, 'demote');
                demoted += batch.length;
            } catch {
                failed += batch.length;
            }
        }

        const senderNum = normalizeNum(sender);

        await socket.sendMessage(from, {
            text: [
                `╭───(    \`𝐃𝐞𝐦𝐨𝐭𝐞 𝐀𝐥𝐥\`    )───`,
                `> *𝐁𝐲:* @${senderNum}`,
                `> *𝐃𝐞𝐦𝐨𝐭𝐞𝐝:* ${demoted} admin(s)`,
                failed > 0 ? `> *𝐅𝐚𝐢𝐥𝐞𝐝:* ${failed} admin(s)` : null,
                `╰──────────────────☉`,
                ``,
                `*Back to being regular members.*`
            ].filter(l => l !== null).join('\n') + FOOTER + PAIR_LINK,
            mentions: [sender, ...toDemote]
        }, { quoted: fakeQuoted });
    }
};
