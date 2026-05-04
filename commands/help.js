const FOOTER = '\n\n> Draxen is fast';

module.exports = {
    name: 'help',
    async execute(socket, msg, number, userConfig, loadUserConfigFromMongo) {

        const fakeQuoted = {
            key: { participant: '0@s.whatsapp.net', remoteJid: '0@s.whatsapp.net', id: msg.key.id },
            message: { conversation: "Verified" },
            contextInfo: { mentionedJid: [], forwardingScore: 999, isForwarded: true }
        };
        const sanitized = (number || '').replace(/[^0-9]/g, '');
        const cfg = await loadUserConfigFromMongo(sanitized) || {};
        const botName = cfg.botName || 'DRAXEN-Ai';

        const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const args = body.trim().split(/\s+/).slice(1).join(' ').toLowerCase();

        const commands = {
            alive: {
                usage: '.alive',
                example: '.alive',
                desc: 'Check if the bot is online and breathing. Shows bot name, owner, and memory usage. Also works with .bot and .test.'
            },
            ai: {
                usage: '.ai <your question>',
                example: '.ai What is the meaning of life?',
                desc: 'Ask the bot anything and it will reply using AI. Also works with .gpt.'
            },
            menu: {
                usage: '.menu',
                example: '.menu',
                desc: 'Shows the full list of all available commands organized by category.'
            },
            pair: {
                usage: '.pair <phone number>',
                example: '.pair 255716945971',
                desc: 'Generate a pairing code to connect a new WhatsApp number to the bot. Use full number with country code, no + sign. Also works with .connect.'
            },
            ping: {
                usage: '.ping',
                example: '.ping',
                desc: 'Check how fast the bot responds. Shows response time in milliseconds. Also works with .p.'
            },
            speed: {
                usage: '.speed',
                example: '.speed',
                desc: 'Shows download/upload speed info along with response time.'
            },
            play: {
                usage: '.play <song name>',
                example: '.play Blinding Lights',
                desc: 'Search for a song on YouTube and download the audio.'
            },
            video: {
                usage: '.video <video name>',
                example: '.video funny cat compilation',
                desc: 'Search for a video on YouTube and download it.'
            },
            yts: {
                usage: '.yts <search term>',
                example: '.yts how to cook pasta',
                desc: 'Search YouTube without downloading. Shows top results with links and durations.'
            },
            tt: {
                usage: '.tt <tiktok link>',
                example: '.tt https://vm.tiktok.com/abc123',
                desc: 'Download a TikTok video without watermark. Also works with .tiktok.'
            },
            ig: {
                usage: '.ig <instagram link>',
                example: '.ig https://www.instagram.com/reel/abc123',
                desc: 'Download videos or photos from Instagram. Also works with .instagram.'
            },
            facebook: {
                usage: '.facebook <facebook video link>',
                example: '.facebook https://www.facebook.com/watch/?v=123456',
                desc: 'Download videos from Facebook. Also works with .fbdl.'
            },
            image: {
                usage: '.image <search term>',
                example: '.image cute puppies',
                desc: 'Search for images on Pinterest. Also works with .img.'
            },
            pin: {
                usage: '.pin <search term>',
                example: '.pin aesthetic wallpaper',
                desc: 'Search Pinterest for images. Also works with .pint and .pinterest.'
            },
            sticker: {
                usage: '.sticker',
                example: '.sticker (send or reply to an image or short video)',
                desc: 'Convert an image or short video (under 30 seconds) into a WhatsApp sticker. Send or reply to media with this command. Also works with .s.'
            },
            lyrics: {
                usage: '.lyrics <song title>',
                example: '.lyrics Someone Like You',
                desc: 'Find the lyrics to any song with artist and album info.'
            },
            weather: {
                usage: '.weather <city name>',
                example: '.weather Nairobi',
                desc: 'Get current weather for any city. Shows temperature, humidity, wind speed, and more.'
            },
            owner: {
                usage: '.owner',
                example: '.owner',
                desc: 'Shows the bot owner contact info.'
            },
            repo: {
                usage: '.repo',
                example: '.repo',
                desc: 'Get the link to the bot source code on GitHub. Also works with .script.'
            },
            tagall: {
                usage: '.tagall <optional message>',
                example: '.tagall Meeting at 5pm!',
                desc: 'Tag every member in a group. Only works in groups. Admin only.'
            },
            hidetag: {
                usage: '.hidetag <optional message>',
                example: '.hidetag Attention everyone!',
                desc: 'Tag all group members silently without showing the tag list. Only works in groups. Admin only.'
            },
            kick: {
                usage: '.kick',
                example: '.kick (reply to or tag the user)',
                desc: 'Remove a member from the group. Reply to their message or tag them. Bot and user must be admin. Also works with .k.'
            },
            add: {
                usage: '.add <phone number>',
                example: '.add 255716945971',
                desc: 'Add a member to the group by phone number. Use country code, no + sign. Bot must be admin.'
            },
            promote: {
                usage: '.promote',
                example: '.promote (reply to or tag the user)',
                desc: 'Promote a group member to admin. Reply to their message or tag them. Bot must be admin.'
            },
            demote: {
                usage: '.demote',
                example: '.demote (reply to or tag the user)',
                desc: 'Demote a group admin back to regular member. Reply to their message or tag them. Bot must be admin.'
            },
            close: {
                usage: '.close',
                example: '.close',
                desc: 'Close the group so only admins can send messages. Bot must be admin. Also works with .mute.'
            },
            open: {
                usage: '.open',
                example: '.open',
                desc: 'Open the group so all members can send messages. Bot must be admin. Also works with .unmute.'
            },
            join: {
                usage: '.join <group invite link>',
                example: '.join https://chat.whatsapp.com/abc123',
                desc: 'Make the bot join a WhatsApp group using an invite link.'
            },
            leave: {
                usage: '.leave',
                example: '.leave',
                desc: 'Make the bot leave the current group.'
            },
            grouplink: {
                usage: '.grouplink',
                example: '.grouplink',
                desc: 'Get the current group invite link. Bot must be admin. Also works with .glink.'
            },
            revoke: {
                usage: '.revoke',
                example: '.revoke',
                desc: 'Revoke and reset the group invite link so the old link stops working. Bot must be admin. Also works with .rvo (not same as view-once).'
            },
            setname: {
                usage: '.setname <new name>',
                example: '.setname My Cool Group',
                desc: 'Change the group name. Bot must be admin.'
            },
            setdesc: {
                usage: '.setdesc <new description>',
                example: '.setdesc Welcome to our group!',
                desc: 'Change the group description. Bot must be admin.'
            },
            groupinfo: {
                usage: '.groupinfo',
                example: '.groupinfo',
                desc: 'Show detailed information about the current group including members, admins, and creation date. Also works with .ginfo.'
            },
            gstatus: {
                usage: '.gstatus <optional caption>',
                example: '.gstatus Check this out! (reply to media)',
                desc: 'Post a status to the group feed. Also works with .groupstatus, .gs, and .togroupstatus.'
            },
            fullpp: {
                usage: '.fullpp',
                example: '.fullpp (reply to an image)',
                desc: 'Set your profile picture to full-size without cropping. Reply to the image. Also works with .setpp and .setprofile.'
            },
            getpp: {
                usage: '.getpp <@mention or number>',
                example: '.getpp @someone',
                desc: 'Get someone\'s WhatsApp profile picture in full size. Also works with .getprofile.'
            },
            rvo: {
                usage: '.rvo',
                example: '.rvo (reply to a view-once message)',
                desc: 'Reveal a view-once message so you can see it again. Also works with .vv.'
            },
            save: {
                usage: '.save',
                example: '.save (reply to a status)',
                desc: 'Save someone\'s WhatsApp status before it disappears.'
            },
            tourl: {
                usage: '.tourl',
                example: '.tourl (reply to an image)',
                desc: 'Convert an image to a shareable URL link.'
            },
            block: {
                usage: '.block',
                example: '.block',
                desc: 'Block the person you are currently chatting with in DM. Only works in private chats, not groups. Owner only.'
            },
            tts: {
                usage: '.tts <text> or reply to a message',
                example: '.tts Hello how are you',
                desc: 'Convert text to a voice note using Google Text-to-Speech. Type text after the command or reply to any message to convert it to audio.'
            },
            stt: {
                usage: '.stt',
                example: '.stt (reply to a voice note)',
                desc: 'Transcribe a voice note or audio message to text using Whisper AI. Reply to any audio message to get the transcription.'
            },
            translate: {
                usage: '.tr <lang code> <text> or reply to a message',
                example: '.tr fr Hello world',
                desc: 'Translate any text to another language. Type the language code followed by the text, or reply to a message with .tr <lang code>. Also works with .translate and .trans.'
            },
            setlang: {
                usage: '.setlang <lang code>',
                example: '.setlang fr',
                desc: 'Set your preferred language. Once set, all bot responses will be automatically translated for you. Use .setlang alone to see all supported languages.'
            },
            help: {
                usage: '.help or .help <command>',
                example: '.help play',
                desc: 'You are literally using it right now. Type .help followed by any command name for detailed instructions.'
            }
        };

        if (args && commands[args]) {
            const cmd = commands[args];
            const detail = `*『 ${botName} 𝙷𝙴𝙻𝙿 』*\n\n╭───(    \`${args.toUpperCase()}\`    )───\n> *What it does:*\n> ${cmd.desc}\n>\n> *How to use it:*\n> \`${cmd.usage}\`\n>\n> *Example:*\n> \`${cmd.example}\`\n╰──────────────────☉\n\n*Now go try it instead of just reading about it.*` + FOOTER;

            return socket.sendMessage(msg.key.remoteJid, {
                text: detail
            }, { quoted: fakeQuoted });
        }

        const allNames = Object.keys(commands);
        const helpList = `*『 ${botName} 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙶𝚄𝙸𝙳𝙴 』*\n\n*Alright listen up. Here is every command this bot has. Pick one and type* \`.help <command>\` *to learn how to use it. It is not that hard.*\n\n╭───(    \`𝐀𝐥𝐥 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬\`    )───\n${allNames.map(n => `> \`»\` .${n} — ${commands[n].desc.split('.')[0]}.`).join('\n')}\n╰──────────────────☉\n\n*Example:* Type \`.help play\` to learn how to download music.\n*Example:* Type \`.help tts\` to learn how to convert text to voice.\n*Example:* Type \`.help setlang\` to learn how to set your language.\n*Example:* Type \`.help sticker\` to learn how to make stickers.\n\n*Stop guessing and start reading.*` + FOOTER;

        await socket.sendMessage(msg.key.remoteJid, {
            text: helpList
        }, { quoted: fakeQuoted });
    }
};
