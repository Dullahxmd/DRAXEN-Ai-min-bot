const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'leave',
    async execute(socket, msg, number) {
        const owner = '255716945971';
        if (number !== owner && number !== (socket.user.id.split(':')[0])) return;
        if (!msg.key.remoteJid.endsWith('@g.us')) return;

        await socket.sendMessage(msg.key.remoteJid, { text: "DRAXEN-Ai is leaving this trash. ✌️" + FOOTER + PAIR_LINK });
        await socket.groupLeave(msg.key.remoteJid);
    }
};
