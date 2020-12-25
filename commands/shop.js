// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

// emote codes from host server
const emote_small = "<:small:791743268593074186>";
const emote_large = "<:large:791743268299079722>";
const emote_fish  = "<:fish:791899217924063244>";
const emote_goldfish  = "<:goldfish:791749110977921055>";
const emote_left = "<:left:791899280721182720>";
const emote_right = "<:right:791835051025367060>";

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
				.setDescription("Purchase goodies with **%shop [item-name]**")
				.addField('\u200B', `**Current Balance**\n${userRow.fish_count} ${emote_fish}, ${userRow.goldfish_count} ${emote_goldfish}`)
				.addField('Size', sizes.join('\n'), true)
				.addField('Goodies', names.join('\n'), true)
				.addField('Price', costs.join('\n'), true)
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
	let item = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!
	
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// setup queries
	const itemExistsQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM GoodiesShop WHERE LOWER(name) == \"${item.toLowerCase()}\"`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
	const purchasedQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM PurchaseLog WHERE discord_id == \"d-${message.author.id}\" AND LOWER(item_name) == \"${item}\"`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
	const balanceQuery = new Promise((resolve, reject) => {
		let sql = `SELECT CASE WHEN (SELECT price_type FROM GoodiesShop WHERE LOWER(name) == \"${item.toLowerCase()}\") == 'F' ` +
			`THEN fish_count - (SELECT price_amount FROM GoodiesShop WHERE LOWER(name) == \"${item.toLowerCase()}\") ` +
			`ELSE goldfish_count - (SELECT price_amount FROM GoodiesShop WHERE LOWER(name) == \"${item.toLowerCase()}\") ` +
			`END new_balance, ` +
			`CASE WHEN (SELECT price_type FROM GoodiesShop WHERE LOWER(name) == \"${item.toLowerCase()}\") == 'F' THEN 'F' ELSE 'G' ` +
			`END currency ` + 
			`FROM PlayerData WHERE discord_id = \"d-${message.author.id}\"`
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			resolve(row);
		});
	});

	// execute queries
	Promise.all([itemExistsQuery, purchasedQuery, balanceQuery]).then( results => {
		let itemExists = typeof results[0] != "undefined";
		let hasPurchased = typeof results[1] != "undefined";
		let canPurchase = results[2].new_balance > 0;

		// edge cases
		if(!itemExists) {
			db.close();
			message.channel.send(`Could not find **${item}** in the shop.`);
		} else if (hasPurchased) {
			db.close();
			message.channel.send(`You have already bought **${results[0].name}**.`);
		} else if (!canPurchase) {
			db.close();
			message.channel.send(`You don't have enough fish...`);
		} else {
			// confirmation message
			const filter = (reaction, user) => {
				// TODO: yes/no
				return [customEmoteId(emote_left), customEmoteId(emote_right)].includes(reaction.emoji.id) && user.id === message.author.id;
			};

			message.channel.send(`Purchase **${results[0].name}**?`).then(confirmation => {
				// TODO: yes/no
				confirmation.react(emote_left).then(() => {
					confirmation.react(emote_right);
				});

				confirmation.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] }).then(collected => {
					const reaction = collected.first();

					// TODO: add if statement to filter (only supposed to be on "yes")
					console.log(reaction.emoji.name);
					confirmation.react("✅");

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
				}).then((args) => {
					db.close();
					// TODO: make a fancy embed :)
					message.channel.send(`You bought **${results[0].name}**!`);
				})
				.catch((a) => {
					db.close();
					console.log(a);
					// reaction window timeout
					confirmation.react("🚫");
				});
			});
		}
	});
}

// todo; move me and make me an import statement
function customEmoteId(emote) {
	return emote.split(':')[2].split('>')[0];
}