const {
	default: WASocket,
	useSingleFileAuthState,
	fetchLatestBaileysVersion,
} = require("@adiwajshing/baileys");
const Pino = require("pino");
const path = require("path").join;
const cron = require("node-cron");
const axios = require("axios");
const cheerio = require("cheerio");
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
	sock.ev.on("creds.update", saveState);

    function res(){
        axios.get("https://www.calendardate.com/ramadan_2023.htm").then(res => {
        const $ = cheerio.load(res.data);
        let myArr = [];
        $("table.t_yhol_adjst tbody tr td strong").each((i, el) => {
            myArr.push({
                result: $(el).text()
            })
        })
        sock.groupUpdateSubject("6281528972549-1587997619@g.us", `The Cousen||H-${myArr[2].result} Ramadhan`)
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