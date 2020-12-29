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
				let size = row.size === 'S' ? emotes.small : emotes.large;
				let name = inventory.filter(entry => entry.item_name == row.name).length > 0 ? `~~\`${rightPadding(row.name)}\`~~` : `\`${rightPadding(row.name)}\``;
				let cost = row.price_type === 'F' ? `\`${leftPadding(row.price_amount)}\` ${emotes.fish}` : `\`${leftPadding(row.price_amount)}\` ${emotes.goldfish}`;
				let rowEntry = `${size} │ ${name} │ ${cost}`; // to be further formatted after compiling

				// pagination of categories
				let pageNumber = 1;
				let entriesPerPage = 15;
				while( `${row.category} (Page ${pageNumber})` in itemLists && itemLists[`${row.category} (Page ${pageNumber})`].length >= entriesPerPage) {
					pageNumber++;
				};

				// create or add row entry to appropriate category and page
				if (`${row.category} (Page ${pageNumber})` in itemLists) {
					itemLists[`${row.category} (Page ${pageNumber})`].push(rowEntry);
				} else {
					itemLists[`${row.category} (Page ${pageNumber})`] = [rowEntry];
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
		.addField('\u200b', `${userRow.goldfish_count} ${emotes.goldfish}`, true);

	let current_category = "Balls (Page 1)"; // TODO: make food first category after adding the food items in
	message.channel.send(shopEmbed).then(() => {
		// display first shop page
		return message.channel.send(createTable(current_category, itemLists));
	}).then(tableMessage => {
		// display emotes to flip shop pages
		return tableMessage.react(emoteID(emotes.left));
	}).then((tableMessageReact) => {
		return tableMessageReact.message.react(emoteID(emotes.right));
	}).then((tableMessageReact) => {
		let tableMessage = tableMessageReact.message;
		// define listener for when original author emotes to flip shop pages
		const filter = (reaction, user) => {
			return [emoteID(emotes.left), emoteID(emotes.right)].includes(reaction.emoji.id) && user.id === message.author.id;
		};	
		const collector = tableMessage.createReactionCollector(filter, { dispose: true, time: 60000 });
		collector.on("collect", (reaction) => {
			current_category = updateTable(tableMessage, reaction, current_category, itemLists);
		});
		collector.on("remove", (reaction) => {
			current_category = updateTable(tableMessage, reaction, current_category, itemLists);
		});
		collector.on("end", () => {
			tableMessage.react('🚫');
		});
	});
}

function rightPadding(inputString) {
	// Goal: right padding with spaces to match item name widths
	let maxLength = 22; // "Grass Cushion (Purple)" from analyzing the GoodiesShop table in memory.db
	let spaces = '';
	for (let i = inputString.length; i < maxLength; i++) { spaces += ' '; }
	return `${inputString}${spaces}`;
}

function leftPadding(inputString) {
	// Goal: left padding with spaces to match price_amount widths
	let maxLength = 4; // Antique Chair (1500 fish)
	let zeros = '';
	for (let i = inputString.toString().length; i < maxLength; i++) { zeros += '0'; }
	return `${zeros}${inputString}`;
}

function createTable(current_category, itemLists) {
	let width = 41;
	let title = `Category: ${current_category}`;

	let spaces = '';
	for (let i = title.length; i < width; i++) { spaces += ' '; }
	let header = `\`${title}${spaces}\``

	let topBorder = '';
	for (let i = 0; i < width; i++) {topBorder += '_'; }
	topBorder = `\`${topBorder}\``;
	
	let border = "`│`";
	let rows = `${border}${itemLists[current_category].join(`${border}\n${border}`)}${border}`;
	
	let bottomBorder = '';
	for (let i = 0; i < width; i++) {bottomBorder += '¯'; }
	bottomBorder = `\`${bottomBorder}\``;

	return `${header}\n${topBorder}\n${rows}\n${bottomBorder}`;
}

function updateTable(table, reaction, current_category, itemLists) {
	let offset = 0;
	if (reaction.emoji.name == "left") offset = -1;
	else if (reaction.emoji.name == "right") offset = 1;
	else return current_category;
	let keys = Object.keys(itemLists);
	let new_category = keys[(keys.indexOf(current_category) + offset + keys.length) % keys.length];
	let new_table = createTable(new_category, itemLists);
	table.edit(new_table);
	return new_category;
}