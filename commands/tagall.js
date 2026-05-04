const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

const normalizeJid = (jid) => {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0].replace(/\D/g, '') + '@s.whatsapp.net';
};

module.exports = {
    name: 'tagall',
    description: 'Tag everyone in the group',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {
        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        try {
            const from = extras?.from || msg.key.remoteJid;
            if (!from.endsWith('@g.us')) return socket.sendMessage(from, { text: 'This command only works in groups.' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });

            const metadata = extras?.groupMetadata || await socket.groupMetadata(from);
            const participants = metadata.participants;
            const mentions = participants.map(p => normalizeJid(p.jid || p.id)).filter(Boolean);

            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = body.split(' ').slice(1).join(' ');
            const messageText = args || 'Wake up, you lazy bums!';

            const txt = [
                `╭───(    \`𝐓𝐚𝐠 𝐀𝐥𝐥\`    )───`,
                `> 📢 *𝐌𝐞𝐬𝐬𝐚𝐠𝐞:* ${messageText}`,
                `> 👥 *𝐂𝐨𝐮𝐧𝐭:* ${mentions.length} targets.`,
                ``,
                ...mentions.map(id => `> 📧 @${id.split('@')[0]}`),
                `╰──────────────────☉`,
                `*Stop ignoring the notifications.*`
            ].join('\n');

            await socket.sendMessage(from, { text: txt + FOOTER + PAIR_LINK, mentions }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(msg.key.remoteJid, { text: 'Failed to tag everyone.' + FOOTER + PAIR_LINK }, { quoted: fakeQuoted });
        }
    }
};
