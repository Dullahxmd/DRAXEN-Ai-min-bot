const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'revoke',
    description: 'Revoke and reset the group invite link',
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

        if (!isGroup) {
            return socket.sendMessage(from, {
                text: '*Revoke what? There is no group link here. Pay attention.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐑𝐞𝐯𝐨𝐤𝐞 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I need to be an admin to revoke links.\n> You know the drill. Promote me.\n╰──────────────────☉` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can revoke the group link. Stay in your lane.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        try {
            const senderNum = sender.split('@')[0].split(':')[0];
            await socket.groupRevokeInvite(from);
            const newCode = await socket.groupInviteCode(from);
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐋𝐢𝐧𝐤 𝐑𝐞𝐯𝐨𝐤𝐞𝐝\`    )───\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Old link has been revoked.\n> *𝐍𝐞𝐰 𝐋𝐢𝐧𝐤:*\n> https://chat.whatsapp.com/${newCode}\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*The old link is dead. Anyone using it can cry about it.*` + FOOTER + PAIR_LINK,
                mentions: [sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to revoke the group link. The universe is against me today.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
