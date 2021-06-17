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
		let name = msg.content.toLowerCase().split(" ")[1];
		(async() => {
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
			let output = "```\n" + format(topAttackers) + "\n" + format(topDefenders) + "```";
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
