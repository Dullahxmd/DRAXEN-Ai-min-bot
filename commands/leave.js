// leave.js
const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'leave',
    async execute(socket, msg, number) {
        const owner = '255716945971';
        if (number !== owner && number !== (socket.user.id.split(':')[0])) return;
        if (!msg.key.remoteJid.endsWith('@g.us')) return;

        await socket.sendMessage(msg.key.remoteJid, { text: "DRAXEN-Ai is leaving this trash. ✌️" + FOOTER });
        await socket.groupLeave(msg.key.remoteJid);
    }
};
