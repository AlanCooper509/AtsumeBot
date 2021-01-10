// import modules
const Discord = require("discord.js");
const {resolve}=require("path");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");
const food=require("./food.js");

// define bot command
module.exports = (message) => {
	let tokens = message.content.split(' ');
	tokens.shift();
	let foodInput = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!

	if (foodInput.toLowerCase() === "thrifty bitz") {
		// special case: infinite amount of basic food
		previewThrifty(message);
	} else {
		// open db
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
			let count = results[1];

			if (typeof food == "undefined") {
				message.channel.send(`Could not find **${foodInput}** as a food item.`);
			} else if (!food.food) {
				message.channel.send(`**${food.name}** is not a food item!`);
			} else if (typeof count == "undefined") {
				message.channel.send(`You do not own any **${food.name}**...`);
			} else {
				previewPlacement(message, food, count);
			}
		});
	}
}

function previewThrifty(message) {
	let db = new sqlite3.Database("memory.s3db");
	
	// 28,800 seconds (8 hours) for Frisky Bitz (not found in GoodiesShop)
	let sql = `SELECT item_name, outside,
		CASE WHEN time_limit IS NULL
			THEN 28800 - (strftime('%s', 'now') - strftime('%s', timestamp))
			ELSE time_limit - (strftime('%s', 'now') - strftime('%s', timestamp))
		END AS time_left
		FROM YardData AS x LEFT JOIN GoodiesShop AS y ON x.item_name == y.name
		WHERE item_type == "Food_Other"
		ORDER BY outside DESC`;
	let yardQuery = new Promise((resolve, reject) => {
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
	yardQuery.then(foods => {
		db.close();
		const confirmEmbed = new Discord.MessageEmbed()
			.attachFiles([`images/goodies/143.png`, "images/logos/Button_Yard.png"])
			.setAuthor(`Place Thrifty Bitz?`, `attachment://143.png`)
			.setThumbnail(`attachment://Button_Yard.png`)
			.setDescription('\u200b')
			.setFooter("React with Outdoors 🏕️ or Indoors 🏠 (1 minute)");

		// two food slots: one indoors, one outdoors
		let placed_outdoors = false;
		let placed_indoors = false;
		foods.forEach(food => {
			if (food.outside) placed_outdoors = true;
			else placed_indoors = true;
			let location = food.outside ? "Outdoors 🏕️" : "Indoors 🏠";
			let timer = food.time_left > 0 ? new Date(food.time_left * 1000).toISOString().substr(11, 8): "No time";
			confirmEmbed.addField(location, `${emotes[food.item_name.toLowerCase().split(' ').join('_')]} ${food.item_name}\n${timer} remaining`);
		});
		
		// edge case: first time placing food outdoors
		if (!placed_outdoors) {
			confirmEmbed.addField("Outdoors 🏕️", `No food currently placed`);
		}
		// edge case: first time placing food indoors
		if (!placed_indoors) {
			confirmEmbed.addField("Indoors 🏠", `No food currently placed`);
		}

		confirmEmbed.addField('\u200b', `> Replace with a fresh bowl of ${emotes["thrifty_bitz"]} **Thrifty Bitz**?`)

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
			
			let updateYard = new Promise((resolve, reject) => {
				let sql = `DELETE FROM YardData WHERE item_type == "Food_Other" AND ${emoji === '🏠' ? 'NOT ' : ''}outside`;
				db.run(sql, [], err => {
					if (err) reject(err);
					else resolve();
				});
			});

			let headers = ["item_name", "item_type", "discord_id", "outside"];
			let values = ["\"Thrifty Bitz\"", "\"Food_Other\"", `\"d-${message.author.id}\"`, emoji === '🏕️' ? 1 : 0];
			return updateYard.then(() => {
				let sql = `INSERT INTO YardData (${headers.join(', ')}) VALUES (${values.join(', ')})`;
				db.run(sql, [], err => {
					if (err) console.log(err);
					else resolve(emoji);
				});
			});
		}).then((emoji) => {
			db.close();
			message.channel.send(`**${message.member.displayName}** placed ${emotes["thrifty_bitz"]} Thrifty Bitz ${emoji === '🏕️' ? "Outside 🏕️" : "Inside 🏠"} the house.`);
		}).catch((a) => {
			// reaction window timeout
			console.log(a);
			confirmation.react('🚫');
		});
	});
}