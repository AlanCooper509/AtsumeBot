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
			// get each available item
			items = [];
			shopRows.forEach(row => {
				let size = row.size === 'S' ? emotes.small : emotes.large;
				let name = `\`${row.name}\``;
				let cost = row.price_type === 'F' ? `${emotes.fish} ${row.price_amount}` : `${emotes.goldfish} ${row.price_amount}`;
				items.push(`${size} ${name} ${cost}`);
			});
			// TODO: categories

			// create embed
			const shopEmbed = new Discord.MessageEmbed()
				.attachFiles(["images/logos/Button_shop.png", "images/logos/atsume.jpg"])
				.setAuthor("Goodies Shop", "attachment://atsume.jpg")
				.setThumbnail("attachment://Button_shop.png")
				.setDescription("> Purchase goodies with\n> **%shop [goodie-name]**")
				.addField('\u200B', `**Current Balance**\n${emotes.fish} ${userRow.fish_count} ${emotes.goldfish} ${userRow.goldfish_count}`)
				.addField(`Size | Goodies | Price`, items.join('\n') + "\n\u200B")
				.setFooter("Browse categories using the arrows below");

			// send embed
			message.channel.send(shopEmbed).then(embed => {
				embed.react(emoteID(emotes.left)).then(() => {
					embed.react(emoteID(emotes.right));
				});
			});
		}
	});
}