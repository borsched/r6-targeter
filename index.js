const unirest = require('unirest');
const cheerio = require('cheerio');
const Discord = require('discord.js');
const Client = new Discord.Client();
Client.login(""); // @TODO
Client.on('ready', () => {
	console.log('ready');
});

Client.on('message', msg => { // must use in a server for the @mention command formatting to work properly
	if (msg.author.id == Client.user.id || !msg.guild) return;
	let user = msg.mentions.members.first();
	if (!user) return;
	if (user.user.id == Client.user.id) {
		let name = msg.content.split(" ")[1];
		(async() => {
			let output = "```\n" + name + "\n\n";
			let isPC =
			await unirest.get(`https://r6.tracker.network/profile/pc/${name}`).then(function(result) {
				let $ = cheerio.load(result.body);
				let stats = $('html body.trn-site.trn-site--small-header div.trn-site__container div#profile.trn-profile div.trn-scont.trn-scont--swap div.trn-scont__content div.trn-scont__content.trn-card.trn-card--dark-header div.trn-card__content.trn-card--light.trn-defstats-grid div.trn-defstat.mb0 div.trn-defstat__value')
				if (stats.length == 0) {
					return false; // not on PC
				}
				let level = stats[0].children[0].data.trim();
				let best = stats[1].children[0].data.trim().replace(',', '');
				let current = stats[2].children[0].data.trim();
				output += "Level: " + level + "\n";
				output += "Current Rank: " + current + "\n";
				output += `Best MMR Rating: ${best} (${getRank(parseInt(best))})\n\n`;

				let kd = $('html body.trn-site.trn-site--small-header div.trn-site__container div#profile.trn-profile div.trn-scont.trn-scont--swap div.trn-scont__content div.trn-scont__content.trn-card.trn-card--dark-header div.trn-card__content.pb16 div.trn-defstats.trn-defstats--width4 div.trn-defstat.trn-defstat--large div.trn-defstat__value')[3].children[0].data.trim();
				output += `Overall KD: ${kd}\n\n`;
				return true;
			});
			if (!isPC) {
				return msg.reply(`${name} is not on PC.`);
			}

			let attackers = [];
			let defenders = [];
			await unirest.get(`https://r6.tracker.network/profile/pc/${name}/operators`).then(function(result) {
				let $ = cheerio.load(result.body);
				$('html body.trn-site.trn-site--small-header div.trn-site__container div#profile.trn-profile div.trn-scont div.trn-scont__content div.trn-card.trn-card--ftr-purple div.trn-table-container table#operators-Attackers.trn-table tbody').children().each(function(i, e) {
					attackers.push(getStats($(e)));
				})
				$('html body.trn-site.trn-site--small-header div.trn-site__container div#profile.trn-profile div.trn-scont div.trn-scont__content div.trn-card.trn-card--ftr-blue div.trn-table-container table#operators-Defenders.trn-table tbody').children().each(function(i, e) {
					defenders.push(getStats($(e)));
				})
			});
			attackers.sort(playtimeSort);
			defenders.sort(playtimeSort);
			let topAttackers = []; // make a 2d array and format it
			for (var i = 0; i < 5; i++) {
				topAttackers.push(attackers[i]);
			}
			let topDefenders = [];
			for (var i = 0; i < 5; i++) {
				topDefenders.push(defenders[i]);
			}
			output += format(topAttackers) + "\n" + format(topDefenders);
			output += "```";
			msg.channel.send(output);
		})();
	}
});

function getStats(operator) {
	let stats = operator.children();
	let name = stats[0].children[1].attribs.src; // hacky. take the url and format it
	name = name.substring(name.lastIndexOf("/") + 1,
		name.lastIndexOf("\.")).toUpperCase();
	let time = stats[1].children[0].data;
	let kd = stats[3].children[0].data;
	return [name, time, kd];
}

function toMinutes(timestamp) { // hours minutes
	timestamp = timestamp.split(" ");
	let h = timestamp[0];
	h = parseInt(h.substring(0, h.length - 1));
	let m = timestamp[1];
	m = parseInt(m.substring(0, m.length - 1));
	return h * 60 + m;
}

function playtimeSort(a, b) { // sort by play time
	let aMin = toMinutes(a[1]);
	let bMin = toMinutes(b[1]);
	if (aMin == bMin) {
		return 0;
	}
	else {
		return (aMin < bMin) ? 1 : -1; // sort descending
	}
}

function format(matrix) { // formats a matrix to have columns aligned
	let output = "";
	for (var row = 0; row < matrix.length; row++) {
		let line = "";
		for (var column = 0; column < matrix[row].length; column++) {
			// inefficient algorithm moment
			let longest = 0; // find the longest element in that column
			// out of all the rows
			for (var i = 0; i < matrix.length; i++) {
				if (matrix[i][column].length > longest) {
					longest = matrix[i][column].length;
				}
			}
			line += matrix[row][column].padEnd(longest) + " | ";
		}
		output += line + "\n";
	}
	return output;
}

function getRank(MMR) {
	let requirements = [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2800, 3000, 3200, 3600, 4000, 4400, 5000];
	let ranks = ["Copper IV", "Copper III", "Copper II", "Copper I", "Bronze V", "Bronze IV", "Bronze III", "Bronze II", "Bronze I", "Silver V", "Silver IV", "Silver III", "Silver II", "Silver I", "Gold III", "Gold II", "Gold I", "Platinum III", "Platinum II", "Platinum I", "Diamond", "Champion"]
	let rank = "Copper V";
	for (var i = 0; i < requirements.length; i++) {
		if (MMR >= requirements[i]) {
			rank = ranks[i];
		}
		else {
			break;
		}
	}
	return rank;
}
