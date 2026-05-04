const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'join',
    async execute(socket, msg, number) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const owner = '254114885159';
        const botNumber = socket.user.id.split(':')[0];

        if (number !== owner && number !== botNumber) return;

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = contextInfo?.quotedMessage;

        let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";

        if (quotedMsg?.conversation) {
            text += " " + quotedMsg.conversation;
        } else if (quotedMsg?.extendedTextMessage?.text) {
            text += " " + quotedMsg.extendedTextMessage.text;
        }

        const mediaCaption = quotedMsg?.imageMessage?.caption || quotedMsg?.videoMessage?.caption;
        if (mediaCaption) {
            text += " " + mediaCaption;
        }

        const match = text.match(/chat\.whatsapp\.com\/([\w\d]+)/);

        if (!match) {
            return socket.sendMessage(msg.key.remoteJid, {
                text: "❌ Where is the link? Reply to a message with a link or provide it after the command, you potato." + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }

        try {
            await socket.groupAcceptInvite(match[1]);
            await socket.sendMessage(msg.key.remoteJid, {
                text: "✅ *DRAXEN-Ai has entered the chat.*" + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        } catch (e) {
            await socket.sendMessage(msg.key.remoteJid, {
                text: "❌ Failed to join. Either the link is revoked, the group is full, or I'm banned from that trash heap." + FOOTER + PAIR_LINK
            }, { quoted: fakeQuoted });
        }
    }
};
