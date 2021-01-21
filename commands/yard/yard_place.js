// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../../helpers/emotes.js");
const emoteID = require("../../helpers/emote2string.js");
const food_place = require("../food/food_place.js");
const {createBrotliCompress}=require("zlib");

// define bot command
module.exports = (message) => {
	let tokens = message.content.split(' ');
	tokens.shift();
	let itemInput = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!

	if (itemInput.toLowerCase() === "thrifty bitz") {
		// special case: infinite amount of basic food (not found in GoodiesShop table)
		food_place(message);
	} else {
		// normal case: check if placing food (redirect) or other (continue on) goodie item
		let db = new sqlite3.Database("memory.s3db");

		// setup queries
		const itemExistsQuery = new Promise((resolve, reject) => {
			let sql = `SELECT * FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\"`;
			db.get(sql, [], (err, row) => {
				if (err) reject(err);
				else resolve(row);
			});
		});
		itemExistsQuery.then((row) => {
			db.close();
			if (typeof row == "undefined") {
				message.channel.send(`Could not find **${itemInput}** as an item.`);
			} else if (row.food) {
				food_place(message);
			} else if (row.category == "Food_Other") {
				message.channel.send(`You cannot place **${row.name}** in the yard!`);
			} else {
				db = new sqlite3.Database("memory.s3db");
				const itemOwnedQuery = new Promise((resolve, reject) => {
					let sql = `SELECT * FROM PurchaseLog WHERE LOWER(item_name) == \"${itemInput.toLowerCase()}\" AND discord_id = \"d-${message.author.id}\"`;
					db.get(sql, [], (err, row) => {
						if (err) reject(err);
						else resolve(row);
					});
				});
				const itemsPlacedQuery = new Promise((resolve, reject) => {
					let sql = `SELECT x.*, y.size FROM YardData AS x INNER JOIN GoodiesShop AS y ON x.item_name == y.name
						WHERE x.discord_id = \"d-${message.author.id}\" AND x.item_type != \"Food_Other\"`;
					db.all(sql, [], (err, rows) => {
						if (err) reject(err);
						else resolve(rows);
					});
				});
				const yardSizeQuery = new Promise((resolve, reject) => {
					let sql = `SELECT COUNT() AS count FROM PurchaseLog WHERE discord_id = \"d-${message.author.id}\" AND item_name == \"Yard Expansion\" GROUP BY item_name`;
					db.get(sql, [], (err, row) => {
						if (err) reject(err);
						else resolve(row);
					});
				});
				// check if owned, check yard if placed, check yard size.
				Promise.all([itemOwnedQuery, itemsPlacedQuery, yardSizeQuery]).then(results => {
					let owned = typeof results[0] != "undefined";
					let yardItems = typeof results[1] != "undefined" ? results[1] : [];
					let expansions = typeof results[2] != "undefined" ? results[2].count : 0;
					db.close();

					if (!owned) {
						message.reply(`you don't own that goodie. You may purchase it using:\n> \`%shop ${row.name}\``);
					} else {
						// find if item currently in yard
						let inYardItem = yardItems.filter(row => row.item_name.toLowerCase() === itemInput.toLowerCase());
						let inYard = inYardItem.length > 0;
	
						// get slots filled data
						let outdoorSlotsFilled = 0;
						let indoorSlotsFilled = 0;
						yardItems.forEach(item => {
							if (item.outside) {
								outdoorSlotsFilled += item.size == 'L' ? 2 : item.size == 'S' ? 1 : 0;
							} else {
								indoorSlotsFilled += item.size == 'L' ? 2 : item.size == 'S' ? 1 : 0;
							}
						});
	
						// calculate yard sizes remaining based on expansions
						let outside = {
							name: "Outdoors 🏕️",
							slots: Math.floor(expansions / 2) + 1, // (+1 since initial size is 1 outdoors, 0 indoors)
							slots_filled: outdoorSlotsFilled,
							slots_left: Math.floor(expansions / 2) + 1 - outdoorSlotsFilled,
							emoji: '🏕️'
						}
						let inside = {
							name: "Indoors 🏠",
							slots: Math.floor(expansions / 2) + expansions % 2,
							slots_filled: indoorSlotsFilled,
							slots_left: Math.floor(expansions / 2) + expansions % 2 - indoorSlotsFilled,
							emoji: '🏠'
						}
						
						let itemSize = row.size == 'L' ? 2 : row.size == 'S' ? 1 : 0;
						if (outside.slots_left + inside.slots_left < itemSize && !inYard) {
							let sizeEmote = row.size == 'S' ? emotes.small : row.size === 'L' ? emotes.large : ":sushi:";
							message.reply(`you need **${itemSize}** ${itemSize > 1 ? "slots" : "slot" } to place **${sizeEmote} ${row.name}** in your **Yard**.\n` +
								`${outside.name}: **${outside.slots_filled}/${outside.slots}** slots currently filled\n` +
								`${inside.name}: **${inside.slots_filled}/${inside.slots}** slots currently filled\n\n` +
								"You may purchase a Yard Expansion using:\n> \`%shop Yard Expansion\`\n" +
								"You can **Put Away** an item from your **Yard** using:\n> \`%yard [goodie-name]\`\n" +
								"You can **View** the items in your **Yard** using one of:\n> \`%yard\`\n> \`%goodies\`");
								// TODO: add a replace function?
						} else {
							selectLocation(message, row, inYardItem, outside, inside);
						}
					}
				});
			}
		});
	}
}

function selectLocation(message, storeItem, yardItem, outside, inside) {
	let sizeEmote = storeItem.size == 'S' ? emotes.small : storeItem.size === 'L' ? emotes.large : ":sushi:";

	if (yardItem.length > 0) {
		// item currently in yard, putting it away upon confirmation
		const locationEmbed = new Discord.MessageEmbed()
			.attachFiles([`images/goodies/${storeItem.image_id}.png`, "images/logos/Button_Yard.png"])
			.setAuthor(`Move ${storeItem.name}?`, `attachment://${storeItem.image_id}.png`)
			.setThumbnail(`attachment://Button_Yard.png`)
			.setDescription(`${storeItem.description} ${sizeEmote}`)
			.addField(outside.name, `**(${outside.slots_filled}/${outside.slots})** slots filled`, true)
			.addField(inside.name, `**(${inside.slots_filled}/${inside.slots})** slots filled`, true)
			.addField("Current Location",  `${yardItem[0].outside == 1 ? outside.name : inside.name}`)
			.addField("\u200b", `> Put away **${storeItem.name}**?`)
			.setImage(`attachment://${storeItem.image_id}.png`)
			.setFooter("React to this message (1 minute)");

		let confirmation; // for scope
		message.channel.send(locationEmbed).then((embed) => {
			confirmation = embed;
			embed.react(emotes.yes).then((embedReact) => {
				embedReact.message.react(emotes.no);
			});
			const filter = (reaction, user) => {
				return [emoteID(emotes.yes), emoteID(emotes.no)].includes(reaction.emoji.id) && user.id === message.author.id;
			};
			return embed.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] });
		}).then(collected => {
			// received user confirmation response
			if(collected.first().emoji.name == "yes") {
				// update YardData to remove the item from the yard
				removeFromYard(message, storeItem);
			} else if (collected.first().emoji.name == "no") {
				// leave everything how it was
				message.channel.send(`${message.member.displayName}'s **${storeItem.name}** was left **${yardItem[0].outside ? outside.name : inside.name}**`);
			}
		})
		.catch((a) => {
			// reaction window timeout
			confirmation.react('🚫');
		});
	} else {
		// item not in yard, attempting to place it outdoors or indoors
		const locationEmbed = new Discord.MessageEmbed()
			.attachFiles([`images/goodies/${storeItem.image_id}.png`, "images/logos/Button_Yard.png"])
			.setAuthor(`Move ${storeItem.name}?`, `attachment://${storeItem.image_id}.png`)
			.setThumbnail(`attachment://Button_Yard.png`)
			.setDescription(`${storeItem.description} ${sizeEmote}`)
			.addField("Outdoors :camping:", `**(${outside.slots_filled}/${outside.slots})** goodies placed`, true)
			.addField("Indoors :house:", `**(${inside.slots_filled}/${inside.slots})** goodies placed`, true)
			.addField("Current Location",  "Inventory :briefcase:")
			.addField("\u200b", `> Place **${storeItem.name}**?`)
			.setImage(`attachment://${storeItem.image_id}.png`)
			.setFooter("React with Outdoors 🏕️ or Indoors 🏠 (1 minute)");

		let confirmation; // for scope
		message.channel.send(locationEmbed).then((embed) => {
			confirmation = embed;
			embed.react('🏕️').then(embedReact => {
				embedReact.message.react('🏠');
			});
			const filter = (reaction, user) => {
				return ['🏕️', '🏠'].includes(reaction.emoji.name) && user.id === message.author.id;
			};
			return embed.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] });
		}).then(collected => {
			// received user confirmation response
			let emoji = collected.first().emoji.name;
			let status = emoji == '🏕️' ? outside : emoji == '🏠' ? inside : null;
			addToYard(message, storeItem, status);
		})
		.catch((a) => {
			console.log(a);
			// reaction window timeout
			confirmation.react('🚫');
		});
	}
}

function removeFromYard(message, item) {
	let db = new sqlite3.Database("memory.s3db");
	let sql = `DELETE FROM YardData WHERE id = (SELECT id FROM YardData WHERE discord_id = \"d-${message.author.id}\" AND item_name == \"${item.name}\" LIMIT 1)`;
	db.run(sql, [], err => {
		if (err) throw(err);
		else message.channel.send(`${message.member.displayName}'s **${item.name}** was removed from the **Yard**`);
	});
	db.close();
}

function addToYard(message, item, status) {
	// check if space outside/inside
	let itemSize = item.size == 'S' ? 1 : item.size == 'L' ? 2 : null;	
	let sizeEmote = item.size == 'S' ? emotes.small : item.size === 'L' ? emotes.large : ":sushi:";

	if (status.slots_left < itemSize) {
		message.reply(`you need **${itemSize}** ${itemSize > 1 ? "slots" : "slot" } to place **${sizeEmote} ${item.name}** ${status.name}\n` +
			`(**${status.slots_filled}/${status.slots}** slots currently filled)\n\n` +
			"You may purchase a Yard Expansion using:\n> \`%shop Yard Expansion\`\n" +
			"You can **Put Away** an item from your **Yard** using:\n> \`%yard [goodie-name]\`\n" +
			"You can **View** the items in your **Yard** using one of:\n> \`%yard\`\n> \`%goodies\`");
			// TODO: add a replace function?
	} else {
		let db = new sqlite3.Database("memory.s3db");
		let headers = ["item_name", "item_type", "discord_id", "outside"];
		let values = [`\"${item.name}\"`, `\"${item.category}\"`, `\"d-${message.author.id}\"`, status.emoji === '🏕️' ? 1 : 0];
		let sql = `INSERT INTO YardData (${headers.join(', ')}) VALUES (${values.join(', ')})`;
		db.run(sql, [], err => {
			if (err) console.log(err);
			else message.channel.send(`${message.member.displayName}'s **${item.name}** was added to the **Yard**`);
		});
		db.close();
	}
}