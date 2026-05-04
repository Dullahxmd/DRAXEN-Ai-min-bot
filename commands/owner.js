const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';

module.exports = {
    name: 'owner',
    description: 'Show owner contact card',
    async execute(socket, msg, number) {
        const jid = msg.key.remoteJid;
        const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:Dullah [DRAXEN Dev]\nTEL;type=CELL;type=VOICE;waid=255756715126:+255756715126\nEND:VCARD';
        await socket.sendMessage(jid, {
            contacts: {
                displayName: 'Dullah [DRAXEN Dev]',
                contacts: [{ vcard }]
            }
        });
        await socket.sendMessage(jid, {
            text: '*👑 Owner contact sent above.*' + FOOTER + PAIR_LINK
        });
    }
};
