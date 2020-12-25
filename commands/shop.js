// import modules
const Discord = require("discord.js");
const {promises}=require("fs");
const {rejects}=require("assert");
const sqlite3 = require("sqlite3").verbose();

// emote codes from host server
const emote_small = "<:small:791743268593074186>";
const emote_large = "<:large:791743268299079722>";
const emote_fish  = "<:fish:791749110881058837>";
const emote_goldfish  = "<:goldfish:791749110977921055>";
const emote_left = "<:left:791835040501858324>";
const emote_right = "<:right:791835051025367060>";

// define bot command
module.exports = (message) => {	
	console.log(message.guild.emojis.cache.find(emoji => emoji.name == "right").id);

	// input case: user is browsing items to purchase
	if (input === "shop" || input === "s") {
		shopping(message);
	}
	
	// TODO: add purchase log
	// TODO: add current currency values
}

function shopping(message) {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// setup queries
	const shopQuery = new Promise((resolve, reject) => {
		sql = `SELECT * FROM GoodiesShop ORDER BY category ASC`
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
	const userQuery = new Promise((resolve, reject) => {
		// TODO
		resolve();
	});

	// execute queries
	Promise.all([shopQuery, userQuery]).then( results => {
		db.close();
		let shopRows = results[0];
		let userResults = results[1];
	
		if (shopRows.length > 0) {
			// get each available item
			let sizes = [], names = [], costs = [];
			shopRows.forEach(row => {
				sizes.push(row.size === 'S' ? emote_small : emote_large);
				names.push(row.name);
				costs.push(row.price_type === 'F' ? `${emote_fish} ${row.price_amount}` : `${emote_goldfish} ${row.price_amount}`);
			});
	
			// create embed
			const shopEmbed = new Discord.MessageEmbed()
				.attachFiles(["images/logos/Button_shop.png", "images/logos/atsume.jpg"])
				.setAuthor("Goodies Shop", "attachment://atsume.jpg")
				.setThumbnail("attachment://Button_shop.png")
				.setDescription("Purchase goodies with **$shop <item name>**\nBrowse categories by reacting using the emotes below.")
				// TODO: retrieve message.author's current balance
				.addField('\u200B', `**Current Balance**: -1 ${emote_fish}, -1 ${emote_goldfish}`)
				.addField('Size', sizes.join('\n'), true)
				.addField('Goodies', names.join('\n'), true)
				.addField('Price', costs.join('\n'), true);

			// send embed
			message.channel.send(shopEmbed).then(embed => {
				embed.react(emote_left.split(':')[2].split('>')[0]);
				embed.react(emote_right.split(':')[2].split('>')[0]);
			});
		}
	});
}