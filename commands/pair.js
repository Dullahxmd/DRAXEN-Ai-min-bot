const axios = require('axios');

const FOOTER = '\n\n> Draxen is fast';
const PAIR_LINK = '\n> 🔗 Pair: https://dullahxmd-v2.vercel.app';
const BACKEND_URL = 'https://draxenai-backendc-01931cfdebba.herokuapp.com';

module.exports = {
    name: 'pair',
    description: 'Pair a new number with WhatsApp Web',
    async execute(socket, msg) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: 'Verified' },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };

        const fullText = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || '';

        const args = fullText.trim().split(/\s+/);
        const rawInput = args.slice(1).join('');

        if (!rawInput) {
            await socket.sendMessage(
                msg.key.remoteJid,
                { text: 'Provide a number to pair.\nUsage: .pair 254712345678' + FOOTER + PAIR_LINK },
                { quoted: fakeQuoted }
            );
            return;
        }

        const targetNumber = rawInput.replace(/\D/g, '');

        if (targetNumber.length < 9) {
            await socket.sendMessage(
                msg.key.remoteJid,
                { text: 'Invalid number. Include your country code without the + sign.\nExample: 254712345678' + FOOTER + PAIR_LINK },
                { quoted: fakeQuoted }
            );
            return;
        }

        await socket.sendMessage(
            msg.key.remoteJid,
            { text: `Generating pairing code for *${targetNumber}*... Please wait.` + FOOTER + PAIR_LINK },
            { quoted: fakeQuoted }
        );

        try {
            const response = await axios.get(
                `${BACKEND_URL}/code/?number=${encodeURIComponent(targetNumber)}`,
                { timeout: 35000, headers: { 'User-Agent': 'ToxicBot/1.0' } }
            );

            const pairingCode = response.data?.code;

            if (!pairingCode) {
                await socket.sendMessage(
                    msg.key.remoteJid,
                    { text: 'Could not generate a code right now. All servers may be busy. Please try again in a moment.' + FOOTER + PAIR_LINK },
                    { quoted: fakeQuoted }
                );
                return;
            }

            const text = `*Pairing Code Ready!*

╭───(    \`𝐏𝐚𝐢𝐫𝐢𝐧𝐠 𝐃𝐞𝐭𝐚𝐢𝐥𝐬\`    )───
> ───≫ PAIRING <<───
> \`»\` 𝐍𝐮𝐦𝐛𝐞𝐫 : ${targetNumber}
> \`»\` 𝐂𝐨𝐝𝐞 : *${pairingCode}*
> \`»\` 𝐒𝐭𝐚𝐭𝐮𝐬 : Active
╰──────────────────☉

*How to use your code:*
1. Open WhatsApp → Settings
2. Tap Linked Devices
3. Tap Link a Device
4. Enter this code` + FOOTER + PAIR_LINK;

            await socket.sendMessage(
                msg.key.remoteJid,
                { text },
                { quoted: fakeQuoted }
            );

        } catch (err) {
            let userMessage = 'Failed to generate pairing code. ';
            if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                userMessage += 'Request timed out — servers may be overloaded. Try again shortly.';
            } else if (err.response?.status >= 500) {
                userMessage += 'Backend server error. Please try again later.';
            } else {
                userMessage += 'Please try again.';
            }

            await socket.sendMessage(
                msg.key.remoteJid,
                { text: userMessage + FOOTER + PAIR_LINK },
                { quoted: fakeQuoted }
            );
        }
    }
};
