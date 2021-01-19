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

	let inventoryQuery = new Promise((resolve, reject) => {
		// get non-food items
		let sql = `SELECT x.item_name, x.size, x.order_id, y.outside FROM (SELECT item_name, size, order_id FROM PurchaseLog
			INNER JOIN GoodiesShop ON item_name == name
			WHERE category != "Food_Other" AND discord_id = \"d-${message.author.id}\") AS x
			LEFT JOIN YardData AS Y ON x.item_name == y.item_name
			ORDER BY order_id`;
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});


	const goodiesEmbed = new Discord.MessageEmbed()
		.attachFiles(["images/logos/Button_Goodies.png", "images/logos/atsume.jpg"])
		.setAuthor("Goodie Inventory", "attachment://atsume.jpg")
		.setThumbnail("attachment://Button_Goodies.png")
		.setDescription("> See info about a goodie using:\n> **%goodies [goodie-name]**\n> \n> Place or Put Away goodies using:\n> **%yard [goodie-name]**");
	message.channel.send(goodiesEmbed).then(() => {
		return inventoryQuery;
	}).then(itemRows => {
		let pages = {};
		itemRows.forEach(row => {
			let size = row.size === 'S' ? emotes.small : row.size === 'L' ? emotes.large : ":sushi:";
			let name = `\`${rightPadding(row.item_name)}\``;
			let yard = row.outside != null ? row.outside == 1 ? "\`out \` :camping:" : "\` in \` :house:" : "\`    \` :black_large_square:";
			let rowEntry = `${size} │ ${name} │ ${yard}`; // to be further formatted after compiling

			// pagination of categories
			const entriesPerPage = 5;
			let pageNumber = 1;
			while( `Inventory (Page ${pageNumber})` in pages && pages[`Inventory (Page ${pageNumber})`].length >= entriesPerPage) {
				pageNumber++;
			};

			// create or add row entry to appropriate category and page
			let pageName = `Inventory (Page ${pageNumber})`;
			if (pageName in pages) {
				pages[pageName].push(rowEntry);
			} else {
				pages[pageName] = [rowEntry];
			}
		});
		return pages;
	}).then(pages => {
		let current_page = "Inventory (Page 1)";
		let tableText = createTable(current_page, pages);
		message.channel.send(tableText).then(tableMessage => {
			// define listener for when original author emotes to turn pages in the selected category
			if (Object.keys(pages).length > 1) {
				const tableFilter = (reaction, user) => {
					return [emoteID(emotes.left), emoteID(emotes.right)].includes(reaction.emoji.id) && user.id === message.author.id;
				}
				const tableCollector = tableMessage.createReactionCollector(tableFilter, { dispose: true, time: 60000 });
				tableCollector.on("collect", (reaction) => {
					current_page = updateTable(tableMessage, reaction, current_page, pages);
				});
				tableCollector.on("remove", (reaction) => {
					current_page = updateTable(tableMessage, reaction, current_page, pages);
				});
				tableCollector.on("end", () => {
					tableMessage.react('🚫');
				});
				return tableMessage;
			}
		}).then( tableMessage => {
			if (Object.keys(pages).length > 1) {
				tableMessage.react(emoteID(emotes.left)).then((tableMessageReact) => {
					return tableMessageReact.message.react(emoteID(emotes.right));
				});
			}
		});
	});
}