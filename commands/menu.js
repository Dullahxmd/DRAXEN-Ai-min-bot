const FOOTER = '\n\n> Draxen ai is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

const CATEGORIES = {
    '𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒': ['play', 'video', 'facebook', 'ig', 'tt', 'pinterest', 'yts', 'tourl'],
    '𝐀𝐈 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒': ['ai', 'image', 'lyrics'],
    '𝐆𝐑𝐎𝐔𝐏 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒': ['tagall', 'hidetag', 'join', 'leave', 'gstatus', 'kick', 'add', 'promote', 'demote', 'close', 'open', 'grouplink', 'revoke', 'setname', 'setdesc', 'groupinfo'],
    '𝐎𝐖𝐍𝐄𝐑 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒': ['owner', 'fullpp', 'getpp', 'block'],
    '𝐁𝐎𝐓 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒': ['alive', 'ping', 'speed', 'menu', 'repo', 'script'],
    '𝐓𝐎𝐎𝐋𝐒 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒': ['rvo', 'save', 'pair', 'weather', 'tts', 'stt', 'translate', 'setlang', 'sticker'],
};

module.exports = {
    name: 'menu',
    description: 'Show main menu',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo, activeSockets, socketCreationTime) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        try {
            const sanitized = (number || '').replace(/[^0-9]/g, '');

            let userCfg = {};
            if (typeof loadUserConfigFromMongo === 'function') {
                userCfg = await loadUserConfigFromMongo(sanitized) || {};
            }

            const startTime = socketCreationTime.get(sanitized) || Date.now();
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            const title = userCfg.botName || 'DRAXEN-Ai';
            const sender = msg.key.participant || msg.key.remoteJid;
            const userNumber = sender.split('@')[0];

            let commandList = '';
            for (const [category, cmds] of Object.entries(CATEGORIES)) {
                commandList += `\n╭───(    \`${category}\`    )───\n`;
                for (const cmd of cmds) {
                    commandList += `> » .${cmd}\n`;
                }
                commandList += `╰──────────────────☉\n`;
            }

            const text = `Ugh, *@${userNumber}*... you again? Fine, here's the menu since you clearly can't survive without me.\n\n╭───(    \`DRAXEN-Ai-𝐌𝐢𝐧𝐢 𝐈𝐧𝐟𝐨\`    )───\n> \`»\` 𝐁𝐨𝐭 𝐍𝐚𝐦𝐞 : ${title}\n> \`»\` 𝐎𝐰𝐧𝐞𝐫 : dullah\n> \`»\` 𝐕𝐞𝐫𝐬𝐢𝐨𝐧 : 1.0.2\n> \`»\` 𝐑𝐮𝐧 𝐓𝐢𝐦𝐞 : ${hours}h ${minutes}m ${seconds}s\n╰──────────────────☉\n${commandList}\n*Now stop staring and pick a command before I lose my patience.*` + FOOTER + PAIR_LINK;

            const draxenImg = require('fs').readFileSync(require('path').join(__dirname, '../draxen.jpg'));

            await socket.sendMessage(msg.key.remoteJid, {
                image: draxenImg,
                caption: text
            }, { quoted: fakeQuoted });

        } catch (error) {
            await socket.sendMessage(msg.key.remoteJid, { text: 'Menu broke. Even my own commands are tired of you.' + FOOTER + PAIR_LINK });
        }
    }
};
