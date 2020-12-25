// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// emote codes from host server
const emote_small     = "<:small:791743268593074186>";
const emote_large     = "<:large:791743268299079722>";
const emote_fish      = "<:fish:791899217924063244>";
const emote_goldfish  = "<:goldfish:791749110977921055>";
const emote_left      = "<:left:791899280721182720>";
const emote_right     = "<:right:791835051025367060>";

// TODO: too hard to read, need to update these later...
const emote_yes       = "<:yes:792158246109708348>";
const emote_no        = "<:no:792158246022414356>";

// define bot command
module.exports = (message) => {
	// input case: user is browsing items to purchase
	if (message.content.match(/^%(s|shop)$/i)) {
		browsing(message);
	}
	// input case: user is attempting to purchase an item
	else if (message.content.match(/^%(s|shop) [a-zA-Z0-9]/i)) {
		purchasing(message);
	}
}

function browsing(message) {
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
				.setDescription("> Purchase goodies with **%shop [item-name]**")
				.addField('\u200B', `**Current Balance**\n${emote_fish} ${userRow.fish_count} ${emote_goldfish} ${userRow.goldfish_count}`)
				.addField('Size', sizes.join('\n') + '\n\u200B', true)
				.addField('Goodies', names.join('\n') + '\n\u200B', true)
				.addField('Price', costs.join('\n') + '\n\u200B', true)
				.setFooter("(TODO) Browse other categories using the arrows below");

			// send embed
			message.channel.send(shopEmbed).then(embed => {
				embed.react(customEmoteId(emote_left)).then(() => {
					embed.react(customEmoteId(emote_right));
				});
			});
		}
	});
}

function purchasing(message) {
	let tokens = message.content.split(' ');
	tokens.shift();
	let itemInput = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!
	
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// setup queries
	const itemExistsQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\"`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
	const purchasedQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM PurchaseLog WHERE discord_id == \"d-${message.author.id}\" AND LOWER(item_name) == \"${itemInput}\"`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
	const balanceQuery = new Promise((resolve, reject) => {
		let sql = `SELECT CASE WHEN (SELECT price_type FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\") == 'F' ` +
			`THEN fish_count - (SELECT price_amount FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\") ` +
			`ELSE goldfish_count - (SELECT price_amount FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\") ` +
			`END new_balance, ` +
			`CASE WHEN (SELECT price_type FROM GoodiesShop WHERE LOWER(name) == \"${itemInput.toLowerCase()}\") == 'F' THEN 'F' ELSE 'G' ` +
			`END currency ` + 
			`FROM PlayerData WHERE discord_id = \"d-${message.author.id}\"`
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			resolve(row);
		});
	});

	// execute queries
	Promise.all([itemExistsQuery, purchasedQuery, balanceQuery]).then( results => {
		let item = results[0];
		let hasPurchased = typeof results[1] != "undefined";
		let canPurchase = results[2].new_balance > 0;

		// edge cases
		if(typeof item == "undefined") {
			db.close();
			message.channel.send(`Could not find **${itemInput}** in the shop.`);
		} else if (hasPurchased) {
			db.close();
			message.channel.send(`You already bought **${item.name}**.`);
		} else if (!canPurchase) {
			db.close();
			message.channel.send(`You don't have enough fish...`);
		} else {
			let currencyEmote = item.price_type == 'F' ? emote_fish : emote_goldfish;
			let sizeEmote = item.size == 'S' ? emote_small : emote_large;

			// confirmation message
			const itemEmbed = new Discord.MessageEmbed()
				.attachFiles([item.img_link, "images/logos/atsume.jpg"])
				.setAuthor(`Purchase New Goodie`, "attachment://atsume.jpg")
				.setThumbnail(`attachment://${path.basename(item.img_link)}`)
				.setDescription(`> Purchase **${item.name}**?`)
				.addField("\u200B", `${item.description} ${sizeEmote}\n\u200B`)
				.addField(`Current Balance`, `${currencyEmote} ${results[2].new_balance + item.price_amount}\n\u200B`, true)
				.addField(`Price`, `${currencyEmote} ${item.price_amount}\n\u200B`, true)
				.addField(`New Balance`, `${currencyEmote} ${results[2].new_balance}\n\u200B`, true)
				.setFooter("React to this message below within one minute");
			const filter = (reaction, user) => {
				return [customEmoteId(emote_yes), customEmoteId(emote_no)].includes(reaction.emoji.id) && user.id === message.author.id;
			};

			message.channel.send(itemEmbed).then(confirmation => {
				confirmation.react(emote_yes).then(() => {
					confirmation.react(emote_no);
				});
				return confirmation.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] });
			}).then(collected => {
				if(collected.first().emoji.name == "yes") {
					// update db
					const addPurchase = new Promise((resolve, reject) => {
						headers = ["discord_id", "item_name"];
						values = [`\"d-${message.author.id}\"`, `\"${results[0].name}\"`];
						let sql = `INSERT INTO PurchaseLog (${headers.join(', ')}) VALUES (${values.join(', ')})`;
						db.run(sql, [], err => {
							if (err) throw(err);
							else resolve();
						});
					});
					const updateBalance = new Promise((resolve, reject) => {
						let sql = `UPDATE PlayerData SET ${results[2].currency == 'F' ? "fish_count" : "goldfish_count"} = ${results[2].new_balance} WHERE discord_id = \"d-${message.author.id}\"`;
						db.run(sql, [], err => {
							if (err) throw(err);
							else resolve();
						});
					})
					return Promise.all([addPurchase, updateBalance]);
				} else {
					return;
				}
			}).then(retVal => {
				// retVal is array of undefined instead of a single undefined on success
				db.close();
				if(typeof retVal != "undefined") {
					message.channel.send(`**${message.member.displayName}** bought **${results[0].name}**!`);
				} else {
					message.channel.send(`**${message.member.displayName}** did not buy **${results[0].name}**.`);
				}
			})
			.catch((a) => {
				db.close();
			});
		}
	});
}

// todo; probably want to move and make as an import statement
function customEmoteId(emote) {
	return emote.split(':')[2].split('>')[0];
}