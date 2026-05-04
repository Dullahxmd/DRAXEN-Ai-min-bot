const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'setdesc',
    description: 'Change the group description',
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
                text: '*This is not a group. There is no description to change here.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐒𝐞𝐭𝐝𝐞𝐬𝐜 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I am not an admin here.\n> Make me admin to change the description.\n╰──────────────────☉` + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can change the group description. Know your role.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        try {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const newDesc = body.split(' ').slice(1).join(' ').trim();

            if (!newDesc) {
                return socket.sendMessage(from, {
                    text: `╭───(    \`𝐒𝐞𝐭𝐝𝐞𝐬𝐜 𝐔𝐬𝐚𝐠𝐞\`    )───\n> *𝐅𝐨𝐫𝐦𝐚𝐭:* .setdesc <description>\n> *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:* .setdesc Welcome to our group\n╰──────────────────☉\n\n*You want me to set an empty description? That is as useful as you are.*` + FOOTER
                }, { quoted: fakeQuoted });
            }

            const senderNum = sender.split('@')[0].split(':')[0];
            await socket.groupUpdateDescription(from, newDesc);
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐃𝐞𝐬𝐜 𝐔𝐩𝐝𝐚𝐭𝐞𝐝\`    )───\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Description changed.\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*Description updated. Hopefully someone actually reads it this time.*` + FOOTER,
                mentions: [sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to change the group description. Try something shorter maybe.*' + FOOTER
            }, { quoted: fakeQuoted });
        }
    }
};
