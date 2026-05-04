const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'setname',
    description: 'Change the group name',
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
                text: '*Set what name? This is not a group. Get it together.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐒𝐞𝐭𝐧𝐚𝐦𝐞 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I need admin rights to change the name.\n> Promote me, then ask again.\n╰──────────────────☉` + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can change the group name. You are just a member.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        try {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const newName = body.split(' ').slice(1).join(' ').trim();

            if (!newName) {
                return socket.sendMessage(from, {
                    text: `╭───(    \`𝐒𝐞𝐭𝐧𝐚𝐦𝐞 𝐔𝐬𝐚𝐠𝐞\`    )───\n> *𝐅𝐨𝐫𝐦𝐚𝐭:* .setname <new name>\n> *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:* .setname My Awesome Group\n╰──────────────────☉\n\n*You forgot the name. What do you want me to change it to, nothing?*` + FOOTER
                }, { quoted: fakeQuoted });
            }

            const senderNum = sender.split('@')[0].split(':')[0];
            const metadata = extras?.groupMetadata || await socket.groupMetadata(from).catch(() => null);
            const oldName = metadata?.subject || 'Unknown';
            await socket.groupUpdateSubject(from, newName);
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐍𝐚𝐦𝐞 𝐂𝐡𝐚𝐧𝐠𝐞𝐝\`    )───\n> *𝐎𝐥𝐝:* ${oldName}\n> *𝐍𝐞𝐰:* ${newName}\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*New name, same energy. Hope it lasts longer than the last one.*` + FOOTER,
                mentions: [sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to change the group name. WhatsApp said no.*' + FOOTER
            }, { quoted: fakeQuoted });
        }
    }
};
