// import modules
const Discord = require("discord.js");
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
	let input = message.content.toLowerCase();

	// input case: user is browsing items to purchase
	if (input === "%shop" || input === "%s") {
		browsing(message);
	}
	
	// TODO: add purchase log
}

function browsing(message) {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// setup queries
	const shopQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM GoodiesShop ORDER BY category ASC`
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
	const userQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM PlayerData WHERE discord_id == \"d-${message.author.id}\"`
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});

	// execute queries
	Promise.all([shopQuery, userQuery]).then( results => {
		db.close();
		let shopRows = results[0];
		let userRow = results[1];
	
		if (shopRows.length > 0) {
			// get each available item
			let sizes = [], names = [], costs = [];
			shopRows.forEach(row => {
				sizes.push(row.size === 'S' ? emote_small : emote_large);
				names.push(row.name);
				costs.push(row.price_type === 'F' ? `${emote_fish} ${row.price_amount}` : `${emote_goldfish} ${row.price_amount}`);
			});
			// TODO: categories

			// create embed
			const shopEmbed = new Discord.MessageEmbed()
				.attachFiles(["images/logos/Button_shop.png", "images/logos/atsume.jpg"])
				.setAuthor("Goodies Shop", "attachment://atsume.jpg")
				.setThumbnail("attachment://Button_shop.png")
				.setDescription("Purchase goodies with **%shop [item-name]**")
				.addField('\u200B', `**Current Balance**\n${userRow.fish_count} ${emote_fish}, ${userRow.goldfish_count} ${emote_goldfish}`)
				.addField('Size', sizes.join('\n'), true)
				.addField('Goodies', names.join('\n'), true)
				.addField('Price', costs.join('\n'), true)
				.setFooter("(TODO) Browse other categories using the arrows below");

			// send embed
			message.channel.send(shopEmbed).then(embed => {
				embed.react(emote_left.split(':')[2].split('>')[0]);
				embed.react(emote_right.split(':')[2].split('>')[0]);
			});
		}
	});
}