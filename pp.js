const {
	default: WASocket,
	DisconnectReason,
	useSingleFileAuthState,
	fetchLatestBaileysVersion,
} = require("@adiwajshing/baileys");
const Pino = require("pino");
const fs = require("fs");
const path = require("path").join;
const { Boom } = require("@hapi/boom");
const { state, saveState } = useSingleFileAuthState(path(__dirname, `session.json`), Pino({ level: "silent" }));

const connect = async () => {
	let { version, isLatest } = await fetchLatestBaileysVersion();
	console.log(`Using: ${version}, newer: ${isLatest}`);
	const sock = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({ level: "silent" }),
		version,
	});

	// creds.update
	sock.ev.on("creds.update", saveState);
	// connection.update
	sock.ev.on("connection.update", async (up) => {
		// console.log(up);
		const { lastDisconnect, connection } = up;
		if (connection) {
			console.log("Connection Status: ", connection);
		}

		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log(`Bad Session File, Please Delete session and Scan Again`);
				sock.logout();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Connection closed, reconnecting....");
				connect();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Connection Lost from Server, reconnecting...");
				connect();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
				sock.logout();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log(`Device Logged Out, Please Delete session and Scan Again.`);
				sock.logout();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Restart Required, Restarting...");
				connect();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Connection TimedOut, Reconnecting...");
				connect();
			} else {
				sock.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
			}
		}
	});


    sock.ev.on("messages.upsert", async (m) => {
        const updateProfilePicture = async (jid, content, options = {}) => {
            const { img } = await Utils_1.generateProfilePicture(content, options);
            await query({
                tag: "iq",
                attrs: {
                    to: WABinary_1.jidNormalizedUser(jid),
                    type: "set",
                    xmlns: "w:profile:picture",
                },
                content: [
                    {
                        tag: "picture",
                        attrs: { type: "image" },
                        content: img,
                    },
                ],
            });
        };
        
        const generateProfilePicture = async (mediaUpload, options) => {
            let bufferOrFilePath;
            if (Buffer.isBuffer(mediaUpload)) {
                bufferOrFilePath = mediaUpload;
            } else if ("url" in mediaUpload) {
                bufferOrFilePath = mediaUpload.url.toString();
            } else {
                bufferOrFilePath = await exports.toBuffer(mediaUpload.stream);
            }
            const lib = await getImageProcessingLibrary();
            let img;
            const { read, MIME_JPEG, RESIZE_BILINEAR } = lib.jimp;
            const jimp = await read(bufferOrFilePath);
            let w = 640;
            let h = 640;
            if (options.no_crop) {
                if (jimp.getWidth() == jimp.getHeight()) (w = 300), (h = 700);
                else if (jimp.getWidth() > jimp.getHeight()) (w = 300), (h = jimp.getHeight() / (jimp.getWidth() / 300));
                else if (jimp.getWidth() < jimp.getHeight()) (h = 700), (w = jimp.getWidth() / (jimp.getHeight() / 700));
                const re_size = jimp.resize(w, h);
                img = jimp.getBufferAsync(MIME_JPEG);
            } else if (options.no_stretch) {
                const min = Math.min(jimp.getWidth(), jimp.getHeight());
                const cropped = jimp.crop(0, 0, min, min);
                img = await cropped.quality(50).resize(640, 640, RESIZE_BILINEAR).getBufferAsync(MIME_JPEG);
            } else {
                const stretch = jimp.resize(w, h);
                img = jimp.quality(50).getBufferAsync(MIME_JPEG);
            }
            return {
                img: await img,
            };
        };
        
		await sock.updateProfilePicture(sock.user.jid, media).then(console.log('SUCCESS')).catch('Haven Wrong')
	});
        
};
connect();