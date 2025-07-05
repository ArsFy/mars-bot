import { TelegramClient } from '@mtcute/bun'
import { Dispatcher, filters } from '@mtcute/dispatcher'
import fs from 'fs';
import phash from 'sharp-phash';
import distance from 'sharp-phash/distance';
import pool from './db.ts';

import * as env from './env.ts'

// Get images by bucket
const getImagesByBucket = async (bucket: string) => {
    return (await pool.query(`SELECT * FROM mars WHERE bucket = $1`, [bucket])).rows as MarsTable[]
}

// PHash
const pHashHex = async (path: string) => {
    try {
        const hash = await phash(fs.readFileSync(path));
        setTimeout(() => {
            try {
                fs.unlinkSync(path);
            } catch (err) {
                console.error("Error deleting file:", err);
            }
        }, 1000);
        return BigInt('0b' + hash).toString(16).padStart(16, '0');
    } catch (error) {
        console.error('Error generating pHash:', error);
        return null;
    }
}

// Init temp directory
if (!fs.existsSync('./temp')) {
    fs.mkdirSync('./temp', { recursive: true })
}

// Init Bot
const tg = new TelegramClient({
    apiId: env.API_ID,
    apiHash: env.API_HASH,
    storage: 'bot-data/session',
})

const dp = Dispatcher.for(tg);

dp.onNewMessage(filters.media, async (msg) => {
    const chatInfo = (msg.chat as any);
    if (chatInfo?.chatType === "channel" && msg?.replies?.discussion != null) {
        if (![
            -1001214996122,
            -1001434817225,
            -1001341930464,
            -1001590459584,
            -1002721098590
        ].includes(msg.chat.id)) {
            console.log("This message is not in the allowed channels, skipping...")
            return;
        }

        try {
            const filepath = `./temp/${msg.chat.id}-${msg.id}.webp`
            await tg.downloadToFile(filepath, (msg.media as any).fileId)
            const hash = await pHashHex(filepath)
            if (hash != null) {
                let isFind = false;
                const bucket = hash.slice(0, 2);
                const images = await getImagesByBucket(bucket);
                for (const image of images) {
                    const dist = distance(image.hash, hash);
                    if (dist <= 5) {
                        isFind = true;
                        console.log("Target", `https://t.me/${chatInfo.id.toString().slice(4)}/${msg.id}`, "Found similar image:", image.url);
                        
                        // Reply to the discussion message
                        setTimeout(async () => {
                            msg.getDiscussionMessage().then(async (discussionMsg) => {
                                if (discussionMsg) {
                                    await tg.sendMedia(discussionMsg.chat.id, {
                                            type: 'photo',
                                            file: 'CAACAgUAAxkBAAMNaGkJAm5F-OQ_spgPRJezBRrD328AAngQAALNwchVzWG4aPZWNxU2BA',
                                        },
                                        {
                                            replyTo: discussionMsg.id,
                                        }
                                    )
                                    await tg.sendText(discussionMsg.chat.id, "火星！此图在 "+image.url +" 亦有记载", {
                                        replyTo: discussionMsg.id,
                                    })
                                    console.log("Replied to discussion message with similar image link");
                                } else {
                                    console.log("No discussion message found")
                                }
                            }).catch((err) => {
                                console.error("Error fetching discussion message:", err)
                            });
                        }, 3000)
                        break;
                    }
                }
                if (!isFind) {
                    await pool.query(
                        `INSERT INTO mars (hash, bucket, channel, url) VALUES ($1, $2, $3, $4)`, 
                        [
                            hash, bucket, 
                            chatInfo?.title.toString(),
                            `https://t.me/c/${chatInfo.id.toString().slice(4)}/${msg.id}`
                        ]
                    );
                }
            }
        } catch (err) {
            console.log("Error:", err)
        }
    }
})

const user = await tg.start()
console.log('Logged in as', "@" + user.username)