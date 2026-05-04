const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'grouplink',
    description: 'Get the group invite link',
    async execute(socket, msg, number, config, loadUserConfigFromMongo, activeSockets, socketCreationTime, extras) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const from = extras?.from || msg.key.remoteJid;
        const isGroup = extras?.isGroup ?? from.endsWith('@g.us');
        const isBotAdmin = extras?.isBotAdmin || false;
        const isAdmin = extras?.isAdmin || false;

        if (!isGroup) {
            return socket.sendMessage(from, {
                text: '*There is no group link in a DM. Are you lost?*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐋𝐢𝐧𝐤 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I need admin rights to fetch the link.\n> Promote me first.\n╰──────────────────☉` + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can get the group link. Ask nicely next time.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        try {
            const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
            const inviteCode = await socket.groupInviteCode(from);
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐆𝐫𝐨𝐮𝐩 𝐋𝐢𝐧𝐤\`    )───\n> *𝐆𝐫𝐨𝐮𝐩:* ${metadata?.subject || 'Unknown'}\n> *𝐌𝐞𝐦𝐛𝐞𝐫𝐬:* ${metadata?.participants?.length || '?'}\n> *𝐋𝐢𝐧𝐤:*\n> https://chat.whatsapp.com/${inviteCode}\n╰──────────────────☉\n\n*Here is your precious link. Do not share it with weirdos.*` + FOOTER
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to get the group link. Maybe try again when the stars align.*' + FOOTER
            }, { quoted: fakeQuoted });
        }
    }
};
