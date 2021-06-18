const r6 = require('.');
const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

readline.question('R6 Name: ', name => {
	r6(name);
});
