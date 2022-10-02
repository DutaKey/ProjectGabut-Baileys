const {
	default: WASocket,
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestWaWebVersion,
} = require("@adiwajshing/baileys");
const Pino = require("pino");
const fs = require("fs")
const path = require("path").join;
const { Boom } = require("@hapi/boom");
const { session } = require("./session");
const config = require("./config.json");

const connect = async () => {
	const { state, saveCreds } = await useMultiFileAuthState(path("./session"));
	let { version, isLatest } = await fetchLatestWaWebVersion();
	console.log(`Using: ${version}, newer: ${isLatest}`);
	const sock = WASocket({
		printQRInTerminal: true,
		auth: state,
		logger: Pino({ level: "silent" }),
		version,
	});
	// creds.update
	sock.ev.on("creds.update", saveCreds);

	// connection.update
	sock.ev.on("connection.update", async (up) => {

		const { lastDisconnect, connection } = up;
		if (connection) {
			console.log("Connection Status: ", connection);
		}

		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log(`Bad Session File, Please Delete ${session} and Scan Again`);
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
				console.log(`Device Logged Out, Please Delete ${session} and Scan Again.`);
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

    function res(){
        axios.get("https://www.calendardate.com/ramadan_2023.htm").then(res => {
        const $ = cheerio.load(res.data);
        let myArr = [];
        $("table.t_yhol_adjst tbody tr td strong").each((i, el) => {
            myArr.push({
                result: $(el).text()
            })
        })
        sock.groupUpdateSubject(config.groupid, `The Cousen||H-${myArr[2].result} Ramadhan`)
    })
    }
    cron.schedule('* * * * *', () => {
        res()
    }, {
        scheduled: true,
        timezone: "Asia/Pontianak"
      });
};
connect();