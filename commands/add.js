
const FOOTER = '\n\n*Free-Mini-Bot Link* https://xhclinton.com/minibot\n> 𝐩𝐨𝐰𝐞𝐫𝐞𝐝 𝐛𝐲 𝐱𝐡_𝐜𝐥𝐢𝐧𝐭𝐨𝐧';

module.exports = {
    name: 'add',
    description: 'Add a member to the group',
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
                text: '*This is not a group. Where exactly do you want me to add someone?*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isBotAdmin) {
            return socket.sendMessage(from, {
                text: `╭───(    \`𝐀𝐝𝐝 𝐅𝐚𝐢𝐥𝐞𝐝\`    )───\n> I need to be an admin to add people.\n> Promote me first, genius.\n╰──────────────────☉` + FOOTER
            }, { quoted: fakeQuoted });
        }

        if (!isAdmin) {
            return socket.sendMessage(from, {
                text: '*Only admins can add people. Stop trying to play boss.*' + FOOTER
            }, { quoted: fakeQuoted });
        }

        try {
            const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const args = body.split(' ').slice(1);

            if (!args[0]) {
                return socket.sendMessage(from, {
                    text: `╭───(    \`𝐀𝐝𝐝 𝐔𝐬𝐚𝐠𝐞\`    )───\n> *𝐅𝐨𝐫𝐦𝐚𝐭:* .add <number>\n> *𝐄𝐱𝐚𝐦𝐩𝐥𝐞:* .add 254712345678\n> Use country code, no + sign.\n╰──────────────────☉\n\n*Is it really that hard to follow instructions?*` + FOOTER
                }, { quoted: fakeQuoted });
            }

            const num = args[0].replace(/[^0-9]/g, '');
            if (!num || num.length < 6) {
                return socket.sendMessage(from, {
                    text: '*That number looks fake. Try a real one with the country code.*' + FOOTER
                }, { quoted: fakeQuoted });
            }

            const targetJid = num + '@s.whatsapp.net';
            const senderNum = sender.split('@')[0].split(':')[0];

            const response = await socket.groupParticipantsUpdate(from, [targetJid], 'add');

            if (response && response[0] && (response[0].status === '403' || response[0].status === '408')) {
                try {
                    const inviteCode = await socket.groupInviteCode(from);
                    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
                    await socket.sendMessage(targetJid, {
                        text: `*You have been invited to join a group.*\n\n${inviteLink}` + FOOTER
                    });
                    await socket.sendMessage(from, {
                        text: `╭───(    \`𝐈𝐧𝐯𝐢𝐭𝐞 𝐒𝐞𝐧𝐭\`    )───\n> *𝐔𝐬𝐞𝐫:* @${num}\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Could not add directly.\n> *𝐀𝐜𝐭𝐢𝐨𝐧:* Invite link sent to DM.\n╰──────────────────☉\n\n*Their privacy settings blocked the add. An invite was sent instead. Not my fault they are paranoid.*` + FOOTER,
                        mentions: [targetJid]
                    }, { quoted: fakeQuoted });
                } catch (e) {
                    await socket.sendMessage(from, {
                        text: `*Failed to add @${num}. Their privacy settings are tighter than Fort Knox.*` + FOOTER,
                        mentions: [targetJid]
                    }, { quoted: fakeQuoted });
                }
            } else {
                await socket.sendMessage(from, {
                    text: `╭───(    \`𝐀𝐝𝐝𝐞𝐝\`    )───\n> *𝐔𝐬𝐞𝐫:* @${num}\n> *𝐒𝐭𝐚𝐭𝐮𝐬:* Successfully added.\n> *𝐁𝐲:* @${senderNum}\n╰──────────────────☉\n\n*Welcome to the chaos. Try not to be boring.*` + FOOTER,
                    mentions: [targetJid, sender]
                }, { quoted: fakeQuoted });
            }

        } catch (error) {
            await socket.sendMessage(from, {
                text: '*Failed to add that user. Blame WhatsApp, not me.*' + FOOTER
            }, { quoted: fakeQuoted });
        }
    }
};
