// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");

module.exports = (message) => {
	let tokens = message.content.split(' ');
	tokens.shift();
	let itemInput = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!

	if (itemInput.toLowerCase() == "thrifty bitz") {
		let item = {
			name: "Thrifty Bitz",
			category: "Food_Other",
			size: 'F',
			food: 1,
			description: "Hardly a fancy feast, but it tastes okay for cheap chow. Guaranteed to contain a minimum of byproducts and fillers.",
			image_id: 143
		}
		sendEmbed(message, item, -1, null);
	} else {
		// open db
		let db = new sqlite3.Database("memory.s3db");
		
		// valid/owned queries
		let validQuery = new Promise((resolve, reject) => {
			let sql = `SELECT * FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\"`;
			db.get(sql, [], (err, row) => {
				if (err) reject(err);
				else resolve(row);
			});
		});
		let ownedQuery = new Promise((resolve, reject) => {
			let sql = `SELECT * FROM PurchaseLog WHERE discord_id == \"d-${message.author.id}\" AND LOWER(item_name) == \"${itemInput}\"`;
			db.all(sql, [], (err, rows) => {
				if (err) reject(err);
				else resolve(rows);
			});
		});
		let yardQuery = new Promise((resolve, reject) => {
			let sql = `SELECT * FROM YardData WHERE discord_id == \"d-${message.author.id}\" AND LOWER(item_name) == \"${itemInput}\"`;
			db.get(sql, [], (err, row) => {
				if (err) reject(err);
				else resolve(row);
			})
		});

		Promise.all([validQuery, ownedQuery, yardQuery]).then(results => {
			let item = results[0];
			let purchases = results[1];
			let yardData = results[2];

			// edge cases
			if (typeof item == "undefined") {
				message.channel.send(`Could not find a goodie called **${itemInput}**.`);
			} else if (purchases.length == 0) {
				message.channel.send(`You don't own that goodie... You may purchase it using:\n> \`%shop ${item.name}\``);
			} else {
				sendEmbed(message, item, purchases, yardData);
			}
		});
	}
}

function sendEmbed(message, item, purchases, yard) {
	let itemEmote = item.size == 'S' ? emotes.small : item.size === 'L' ? emotes.large : item.food ? emotes[item.name.toLowerCase().split(" ").join("_")] : ":sushi:";

	// create confirmation message
	const itemEmbed = new Discord.MessageEmbed()
		.attachFiles([`images/goodies/${item.image_id}.png`, "images/logos/Button_Goodies.png"])
		.setAuthor(`${message.member.displayName}'s ${item.name}`, `attachment://${item.image_id}.png`)
		.setDescription(`${item.description} ${itemEmote}\n\u200B`)
		.addField("Category", `${item.category} ${emotes[item.category.toLowerCase()]}`, true)
		.setThumbnail(`attachment://Button_Goodies.png`)
		.setImage(`attachment://${item.image_id}.png`);

	if (item.food) {
		let length = item.name == "Thrifty Bitz" ? "Unlimited" : purchases.length;
		itemEmbed.addField(`Currently Owned`, length, true);
	} else if (item.category == "Food_Other") {
		if(item.name == "Yard Expansion") {
			let outside = Math.floor(purchases.length, 2) + 1;
			let inside = Math.floor(purchases.length, 2);
			itemEmbed.addField("Outdoors :camping:", `${outside} ${outside > 1 ? "Slots" : "Slot"}`, true);
			itemEmbed.addField("Indoors :house:", `${inside} ${inside > 1 ? "Slots" : "Slot"}`, true);
		} else {
			itemEmbed.addField(`Times Purchased`, purchases.length, true);
		}
	} else {
		let datetime = new Date(purchases[0].timestamp);
		let location = typeof yard == "undefined" ? "Inventory :briefcase:" : yard.outside ? "Outdoors :camping:" : "Indoors :house:";
		itemEmbed.addField("Where", location, true);
		itemEmbed.addField("Purchased On", `${datetime.toLocaleDateString()} at ${datetime.toLocaleTimeString()}`, true);
	}
	message.channel.send(itemEmbed)
}