// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");
const emoteID = require("../helpers/emote2string.js");
const rightPadding = require("../helpers/rightPadding.js");
const createTable = require("../helpers/table_create.js");
const updateTable = require("../helpers/table_update.js");

module.exports = (message) => {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// setup queries
	const shopQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM GoodiesShop ORDER BY order_id ASC`;
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
	const soldQuery = new Promise((resolve, reject) => {
		let sql = `SELECT item_name FROM PurchaseLog WHERE discord_id == \"d-${message.author.id}\"`;
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});

	// execute queries
	Promise.all([shopQuery, userQuery, soldQuery]).then( results => {
		db.close();
		let shopRows = results[0];
		let userRow = results[1];
		let inventory = results[2];

		if (shopRows.length > 0) {
			// sort items by category (dictionary of lists)
			itemLists = {};
			shopRows.forEach(row => {
				let category = row.category.toLowerCase();
				let size = row.size === 'S' ? emotes.small : row.size === 'L' ? emotes.large : row.food ? emotes[row.name.toLowerCase().split(" ").join("_")] : ":sushi:";
				let name = inventory.filter(entry => entry.item_name == row.name).length > 0 && category !== "food_other" ? `~~\`${rightPadding(row.name)}\`~~` : `\`${rightPadding(row.name)}\``;
				let cost = row.price_type === 'F' ? `\`${leftPadding(row.price_amount)}\` ${emotes.fish}` : `\`${leftPadding(row.price_amount)}\` ${emotes.goldfish}`;
				let rowEntry = `${size} │ ${name} │ ${cost}`; // to be further formatted after compiling

				// pagination of categories
				const entriesPerPage = 8;
				let pageNumber = 1;
				while( `${category} (Page ${pageNumber})` in itemLists && itemLists[`${category} (Page ${pageNumber})`].length >= entriesPerPage) {
					pageNumber++;
				};

				// create or add row entry to appropriate category and page
				if (`${category} (Page ${pageNumber})` in itemLists) {
					itemLists[`${category} (Page ${pageNumber})`].push(rowEntry);
				} else {
					itemLists[`${category} (Page ${pageNumber})`] = [rowEntry];
				}
			});

			sendReplies(message, userRow, itemLists);
		}
	});
}

function sendReplies(message, userRow, itemLists) {
	// create embed specifying shop information
	const shopEmbed = new Discord.MessageEmbed()
		.attachFiles(["images/logos/Button_shop.png", "images/logos/atsume.jpg"])
		.setAuthor("Goodies Shop", "attachment://atsume.jpg")
		.setThumbnail("attachment://Button_shop.png")
		.setDescription("> Purchase new goodies using:\n> **%shop [goodie-name]**")
		.addField("Current Balance:", `${userRow.fish_count} ${emotes.fish}`, true)
		.addField('\u200b', `${userRow.goldfish_count} ${emotes.goldfish}`, true)
		.addField('\u200b', "**Select a Category**")
		.setFooter("React below, hover for description");

	let emote_categories = [
		emoteID(emotes.food_other),
		emoteID(emotes.balls),
		emoteID(emotes.boxes),
		emoteID(emotes.beds),
		emoteID(emotes.furniture),
		emoteID(emotes.tunnels),
		emoteID(emotes.toys),
		emoteID(emotes.heating),
		emoteID(emotes.bags_hiding),
		emoteID(emotes.scratching),
		emoteID(emotes.baskets)
	];
	message.channel.send(shopEmbed).then(embed => {
		// define listener for when original author emotes to select category
		const embedFilter = (reaction, user) => {
			return emote_categories.includes(reaction.emoji.id) && user.id === message.author.id;
		};	
		const embedCollector = embed.createReactionCollector(embedFilter, { max: 1, time: 60000 });
		embedCollector.on("collect", (reaction) => {
			let category = reaction.emoji.name;
			let current_page = `${category} (Page 1)`;
			let tableText = createTable(current_page, itemLists);
			
			message.channel.send(tableText).then(tableMessage => {
				// define listener for when original author emotes to turn pages in the selected category
				if (Object.keys(itemLists).filter(page => page.startsWith(category)).length > 1) {
					const tableFilter = (reaction, user) => {
						return [emoteID(emotes.left), emoteID(emotes.right)].includes(reaction.emoji.id) && user.id === message.author.id;
					}
					const tableCollector = tableMessage.createReactionCollector(tableFilter, { dispose: true, time: 60000 });
					tableCollector.on("collect", (reaction) => {
						current_page = updateTable(tableMessage, reaction, current_page, itemLists);
					});
					tableCollector.on("remove", (reaction) => {
						current_page = updateTable(tableMessage, reaction, current_page, itemLists);
					});
					tableCollector.on("end", () => {
						tableMessage.react('🚫');
					});
					return tableMessage;
				}
			}).then( tableMessage => {
				if (Object.keys(itemLists).filter(page => page.startsWith(category)).length > 1) {
					tableMessage.react(emoteID(emotes.left)).then((tableMessageReact) => {
						return tableMessageReact.message.react(emoteID(emotes.right));
					});
				}
			});
		});
		embedCollector.on("end", () => {
			embed.react('🚫');
		});
		return embed;
	}).then(embed => {
		if (emote_categories.length > 0) {
			let reactPromise = embed.react(emote_categories[0]);
			for (let i = 1; i < emote_categories.length; i++) {
				reactPromise = reactPromise.then(react => {
					if(!embed.reactions.cache.has('🚫')) {
						return react.message.react(emote_categories[i]);
					}
				});
			}
		}
	});
}

function leftPadding(inputString) {
	// Goal: left padding with spaces to match price_amount widths
	let maxLength = 4; // Antique Chair (1500 fish)
	let zeros = '';
	for (let i = inputString.toString().length; i < maxLength; i++) { zeros += '0'; }
	return `${zeros}${inputString}`;
}