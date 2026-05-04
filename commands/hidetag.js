const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'hidetag',
    description: 'Tag everyone without showing the tag list',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = extras?.from || msg.key.remoteJid;
        const isGroup = extras?.isGroup ?? from.endsWith('@g.us');
        const isAdmin = extras?.isAdmin || false;

        if (!isGroup) {
            return socket.sendMessage(from, {
                text: '*Hidetag only works in groups. Who are you trying to tag in a DM?*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can use hidetag. You do not have that privilege.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        try {
            const metadata = extras?.groupMetadata || await socket.groupMetadata(from);
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const text = body.split(' ').slice(1).join(' ').trim() || 'Attention everyone.';
            const mentions = metadata.participants.map(p => p.jid || p.id);

            await socket.sendMessage(from, { text, mentions });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to send hidetag. Even the shadows betray me sometimes.*' + FOOTER
            }, { quoted: fakeQuoted });
        }
    }
};
