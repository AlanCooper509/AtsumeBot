// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");
const status = require("../helpers/food_status.js");

// define bot command
module.exports = (message) => {
	let tokens = message.content.split(' ');
	tokens.shift();
	let foodInput = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!

	if (foodInput.toLowerCase() === "thrifty bitz") {
		// special case: infinite amount of basic food (not found in GoodiesShop table)
		let food = {name: "Thrifty Bitz", image_id: 143, time_limit: 28800}
		previewPlacement(message, food, 0, isThrifty = true);
	} else {
		// normal case: placing other food item
		let db = new sqlite3.Database("memory.s3db");

		// setup queries
		const foodExistsQuery = new Promise((resolve, reject) => {
			let sql = `SELECT * FROM GoodiesShop WHERE LOWER(name) == \"${foodInput.toLowerCase()}\"`;
			db.get(sql, [], (err, row) => {
				if (err) reject(err);
				else resolve(row);
			});
		});
		const inventoryQuery = new Promise((resolve, reject) => {
			let sql = `SELECT COUNT() AS count FROM PurchaseLog
				INNER JOIN GoodiesShop ON item_name == name
				WHERE LOWER(item_name) == \"${foodInput.toLowerCase()}\" AND discord_id = \"d-${message.author.id}\"
				GROUP BY item_name`;
			db.get(sql, [], (err, row) => {
				if (err) reject(err);
				else resolve(row);
			})
		});

		// execute queries
		Promise.all([foodExistsQuery, inventoryQuery]).then( results => {
			db.close();
			let food = results[0];
			let count_obj = results[1];

			if (typeof food == "undefined") {
				message.channel.send(`Could not find **${foodInput}** as a food item.`);
			} else if (!food.food) {
				message.channel.send(`**${food.name}** is not a food item!`);
			} else if (typeof count_obj == "undefined") {
				message.channel.send(`You don't have any **${food.name}**.`);
			} else {
				previewPlacement(message, food, count_obj.count, isThrifty = false);
			}
		});
	}
}

function previewPlacement(message, food, count, isThrifty) {
	// execute query
	let yardQuery = new Promise(status.yardStatus);
	yardQuery.then(foods => {
		const confirmEmbed = new Discord.MessageEmbed()
			.attachFiles([`images/goodies/${food.image_id}.png`, "images/logos/Button_Yard.png"])
			.setAuthor(`Place ${food.name}?`, `attachment://${food.image_id}.png`)
			.setThumbnail(`attachment://Button_Yard.png`)
			.setDescription('\u200b')
			.setFooter("React with Outdoors 🏕️ or Indoors 🏠 (1 minute)");

		status.addFields(confirmEmbed, foods);

		confirmEmbed.addField('\u200b', `> Replace with a fresh bowl of ${emotes[food.name.toLowerCase().split(' ').join('_')]} **${food.name}**?\n> *Currently own: ${count > 0 ? count : "Unlimited"}*`);

		// send confirmation message
		let confirmation; // for scope
		message.channel.send(confirmEmbed).then(embed => {
			confirmation = embed;
			embed.react('🏕️').then(embedReact => {
				embedReact.message.react('🏠');
			});
			let filter = (reaction, user) => {
				return ['🏕️', '🏠'].includes(reaction.emoji.name) && user.id === message.author.id;
			};
			return embed.awaitReactions(filter, {max: 1, time: 60000, errors: ['time'] });
		}).then(collected => {
			db = new sqlite3.Database("memory.s3db");
			let emoji = collected.first().emoji.name;
			
			let removeFromYard = new Promise((resolve, reject) => {
				let sql = `DELETE FROM YardData WHERE item_type == \"Food_Other\" AND${emoji === '🏠' ? " NOT " : ' '}outside`;
				db.run(sql, [], err => {
					if (err) reject(err);
					else resolve(emoji);
				});
			});
			let addToYard = new Promise((resolve, reject) => {
				let headers = ["item_name", "item_type", "discord_id", "outside"];
				let values = [`\"${food.name}\"`, "\"Food_Other\"", `\"d-${message.author.id}\"`, emoji === '🏕️' ? 1 : 0];
				let sql = `INSERT INTO YardData (${headers.join(', ')}) VALUES (${values.join(', ')})`;
				db.run(sql, [], err => {
					if (err) reject(err);
					else resolve();
				});
			});
			let updateInventory = new Promise((resolve, reject) => {
				if (isThrifty) resolve();
				else {
					let sql = `DELETE FROM PurchaseLog WHERE id = (SELECT id FROM PurchaseLog WHERE discord_id = \"d-${message.author.id}\" AND item_name = \"${food.name}\" LIMIT 1)`;
					db.run(sql, [], err => {
						if (err) reject(err);
						else resolve();
					})
				}
			});
			return Promise.all([removeFromYard, addToYard, updateInventory]);
		}).then((outputs) => {
			let emoji = outputs[0];
			db.close();
			message.channel.send(`**${message.member.displayName}** placed ${emotes[food.name.toLowerCase().split(' ').join('_')]} ${food.name} ${emoji === '🏕️' ? "Outside 🏕️" : "Inside 🏠"} the house.`);
		}).catch((a) => {
			// reaction window timeout
			confirmation.react('🚫');
		});
	});
}