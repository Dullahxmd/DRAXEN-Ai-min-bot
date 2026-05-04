const { jidNormalizedUser } = require('@whiskeysockets/baileys');

const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'getpp',
    async execute(socket, msg) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        const args = text.trim().split(/\s+/);
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        
        let target;

     
        if (contextInfo?.mentionedJid?.[0]) {
            target = contextInfo.mentionedJid[0];
        } 
      
        else if (contextInfo?.quotedMessage) {
            target = contextInfo.participant;
        } 
     
        else if (args[1]) {
            let rawNum = args.slice(1).join('').replace(/\D/g, '');
            if (rawNum.length >= 10) {
                target = `${rawNum}@s.whatsapp.net`;
            }
        } 
    
        else {
            target = msg.key.remoteJid;
        }

        const cleanJid = jidNormalizedUser(target);

        try {
          
            const ppUrl = await socket.profilePictureUrl(cleanJid, 'image');

            await socket.sendMessage(msg.key.remoteJid, {
                image: { url: ppUrl },
                caption: `*👤 Target:* @${cleanJid.split('@')[0]}\n*—*\n*DRAXEN-Ai*` + FOOTER,
                mentions: [cleanJid]
            }, { quoted: fakeQuoted });

        } catch (e) {
          
            try {
                const ppUrl = await socket.profilePictureUrl(cleanJid, 'preview');
                await socket.sendMessage(msg.key.remoteJid, {
                    image: { url: ppUrl },
                    caption: `*👤 Target:* @${cleanJid.split('@')[0]}\n*—*\n*Tσxιƈ-ɱԃȥ (Low Res)*` + FOOTER,
                    mentions: [cleanJid]
                }, { quoted: fakeQuoted });
            } catch (err) {
                await socket.sendMessage(msg.key.remoteJid, { 
                    text: "Privacy settings are blocking me. They clearly have better taste than you." + FOOTER 
                });
            }
        }
    }
};
