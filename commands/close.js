const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'close',
    description: 'Close group - only admins can send messages',
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
                text: '*Close what? This is not a group. Use your eyes.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐂𝐥𝐨𝐬𝐞 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I am not an admin here.\n> Give me admin rights first.\n╰──────────────────☉` + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can close the group. Sit down.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        try {
            const senderNum = sender.split('@')[0].split(':')[0];
            await socket.groupSettingUpdate(from, 'announcement');
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐆𝐫𝐨𝐮𝐩 𝐂𝐥𝐨𝐬𝐞𝐝\`    )───\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Group is now closed.\n> *𝐌𝐨𝐝𝐞:* Only admins can send messages.\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*Everyone shut up. Admins are talking now.*` + FOOTER,
                mentions: [sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to close the group. Even silence has its limits.*' + FOOTER
            }, { quoted: fakeQuoted });
        }
    }
};
