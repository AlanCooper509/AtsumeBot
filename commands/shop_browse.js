// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");
const emoteID = require("../helpers/emote2string.js");

module.exports = (message) => {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// setup queries
	const shopQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM GoodiesShop ORDER BY category ASC`;
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
	const userQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM PlayerData WHERE discord_id == \"d-${message.author.id}\"`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
	// TODO: purchased query
	
	// execute queries
	Promise.all([shopQuery, userQuery]).then( results => {
		db.close();
		let shopRows = results[0];
		let userRow = results[1];

		if (shopRows.length > 0) {
			// sort items by category (dictionary of lists)
			itemLists = {};
			shopRows.forEach(row => {
				let size = row.size === 'S' ? emotes.small : emotes.large;
				let name = `\`${row.name}\``;
				let cost = row.price_type === 'F' ? `${emotes.fish} ${row.price_amount}` : `${emotes.goldfish} ${row.price_amount}`;
				let rowEntry = `${size} ${name} ${cost}`; // to be formatted after compiling
				if (Object.keys(itemLists).includes(row.category)) {
					itemLists[row.category].push(rowEntry);
				} else {
					itemLists[row.category] = [rowEntry];
				}
			});

			// right padding with spaces to match item name widths in each category
			Object.keys(itemLists).forEach(key => {
				itemLists[key] = addSpaces(itemLists[key]);
			});

			// create embed specifying category to display
			const shopEmbed = createEmbed(userRow, itemLists, current_category = "Balls");

			// send embed
			let embed; // for scope
			message.channel.send(shopEmbed).then(embedMessage => {
				embed = embedMessage;
				return embed.react(emoteID(emotes.left));
			}).then(() => {
				return embed.react(emoteID(emotes.right));
			}).then(() => {
				const filter = (reaction, user) => {
					return [emoteID(emotes.left), emoteID(emotes.right)].includes(reaction.emoji.id) && user.id === message.author.id;
				};	
				const collector = embed.createReactionCollector(filter, { dispose: true, time: 60000 });
				collector.on("collect", (reaction) => {
					current_category = updateEmbed(embed, reaction, itemLists, current_category, userRow);
				});
				collector.on("remove", (reaction) => {
					current_category = updateEmbed(embed, reaction, itemLists, current_category, userRow);
				});
				collector.on("end", () => {
					embed.react('🚫');
				});
			});
		}
	});
}

function addSpaces(stringArray) {
	let maxLength = stringArray.reduce((a, b) => { return a.split('`')[1].length > b.split('`')[1].length ? a : b; }).split('`')[1].length;
	stringArray.forEach((val, idx) => {
		let tokens = val.split('`');
		let spaces = '';
		for (let i = tokens[1].length; i < maxLength; i++) { spaces += ' '; }
		stringArray[idx] = `${tokens[0]}\`${tokens[1]}${spaces}\`${tokens[2]}`;
	});
	return stringArray;
}

function createEmbed(userRow, itemLists, current_category) {
	return new Discord.MessageEmbed()
		.attachFiles(["images/logos/Button_shop.png", "images/logos/atsume.jpg"])
		.setAuthor("Goodies Shop", "attachment://atsume.jpg")
		.setThumbnail("attachment://Button_shop.png")
		.setDescription("> Purchase goodies with\n> **%shop [goodie-name]**")
		.addField('\u200B', `**Current Balance**\n${emotes.fish} ${userRow.fish_count} ${emotes.goldfish} ${userRow.goldfish_count}`)
		.addField(`Category: ${current_category}`, itemLists[current_category].join('\n') + "\n\u200B")
		.setFooter("Browse using the arrows below (1 minute)");
}

function updateEmbed(embed, reaction, itemLists, current_category, userRow) {
	let offset = 0;
	if (reaction.emoji.name == "left") offset = -1;
	else if (reaction.emoji.name == "right") offset = 1;
	else return current_category;
	let keys = Object.keys(itemLists);
	let new_category = keys[(keys.indexOf(current_category) + offset + keys.length) % keys.length];
	let new_embed = createEmbed(userRow, itemLists, new_category);
	embed.edit(new_embed);
	return new_category;
}