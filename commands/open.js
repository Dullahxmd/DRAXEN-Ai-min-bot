const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'open',
    description: 'Open group - all members can send messages',
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
                text: '*Open what? This is a private chat. Think before you type.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐎𝐩𝐞𝐧 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I am not an admin in this group.\n> Cannot open what I do not control.\n╰──────────────────☉` + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can open the group. Wait your turn.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        try {
            const senderNum = sender.split('@')[0].split(':')[0];
            await socket.groupSettingUpdate(from, 'not_announcement');
            await socket.sendMessage(from, {
                text: `╭───(    \`𝐆𝐫𝐨𝐮𝐩 𝐎𝐩𝐞𝐧𝐞𝐝\`    )───\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Group is now open.\n> *𝐌𝐨𝐝𝐞:* All members can send messages.\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*Alright peasants, you can talk again. Do not make me regret this.*` + FOOTER + PAIR_LINK,
                mentions: [sender]
            }, { quoted: fakeQuoted });
        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to open the group. Tough luck.*' + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
