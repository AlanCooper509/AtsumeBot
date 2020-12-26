// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");
const emoteID = require("../helpers/emote2string.js");
const path = require("path");

module.exports = (message) => {
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
		let canPurchase = results[2].new_balance >= 0;

		// edge cases
		if(typeof item == "undefined") {
			db.close();
			message.channel.send(`Could not find **${itemInput}** in the shop.`);
		} else if (hasPurchased) {
			db.close();
			message.channel.send(`**${item.name}** has already been purchased.`);
		} else if (!canPurchase) {
			db.close();
			message.channel.send(`You don't have enough ${item.price_type == 'F' ? "fish" : "goldfish"}...`);
		} else {
			db.close();
			previewPurchase(message, item, results[2].new_balance);
		}
	});
}

function previewPurchase(message, item, new_balance) {
	let currencyEmote = item.price_type == 'F' ? emotes.fish : emotes.goldfish;
	let sizeEmote = item.size == 'S' ? emotes.small : emotes.large;

	// create confirmation message
	const itemEmbed = new Discord.MessageEmbed()
		.attachFiles([item.img_link, "images/logos/Button_Shop.png"])
		.setAuthor(`${item.name}`, `attachment://${path.basename(item.img_link)}`)
		.setDescription(`${item.description} ${sizeEmote}\n\u200B`)
		.setThumbnail(`attachment://Button_Shop.png`)
		.addField(`Current Balance`, `${currencyEmote} ${new_balance + item.price_amount}`, true)
		.addField(`Price`, `${currencyEmote} ${item.price_amount}`, true)
		.addField(`New Balance`, `${currencyEmote} ${new_balance}`, true)
		.addField('\u200B', `> Purchase **${item.name}**?`)
		.setImage(`attachment://${path.basename(item.img_link)}`)
		.setFooter("React to this message (1 minute)");
	const filter = (reaction, user) => {
		return [emoteID(emotes.yes), emoteID(emotes.no)].includes(reaction.emoji.id) && user.id === message.author.id;
	};

	// send confirmation message
	let confirmation; // for scope
	message.channel.send(itemEmbed).then(confirmationMessage => {
		confirmation = confirmationMessage;
		confirmation.react(emotes.yes).then(() => {
			confirmation.react(emotes.no);
		});
		return confirmation.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] });
	}).then(collected => {
		// received user confirmation response
		if(collected.first().emoji.name == "yes") {
			performPurchase(message, item, new_balance);
		} else if (collected.first().emoji.name == "no") {
			message.channel.send(`**${message.member.displayName}** did not buy the **${item.name}**...`);
		}
	})
	.catch((a) => {
		// reaction window timeout
		confirmation.react('🚫');
	});
}

function performPurchase(message, item, new_balance) {
	// update db
	let db = new sqlite3.Database("memory.s3db");
	const addPurchase = new Promise((resolve, reject) => {
		headers = ["discord_id", "item_name"];
		values = [`\"d-${message.author.id}\"`, `\"${item.name}\"`];
		let sql = `INSERT INTO PurchaseLog (${headers.join(', ')}) VALUES (${values.join(', ')})`;
		db.run(sql, [], err => {
			if (err) throw(err);
			else resolve();
		});
	});
	const updateBalance = new Promise((resolve, reject) => {
		let sql = `UPDATE PlayerData SET ${item.price_type == 'F' ? "fish_count" : "goldfish_count"} = ${new_balance} WHERE discord_id = \"d-${message.author.id}\"`;
		db.run(sql, [], err => {
			if (err) throw(err);
			else resolve();
		});
	})
	return Promise.all([addPurchase, updateBalance]).then(() => {
		db.close();
		message.channel.send(`**${message.member.displayName}** bought **${item.name}**!`);
	});
}