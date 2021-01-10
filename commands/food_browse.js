// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");

// define bot command
module.exports = (message) => {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	// get count of food items
	let sql = `SELECT item_name, COUNT() AS count FROM PurchaseLog
		INNER JOIN GoodiesShop ON item_name == name
		WHERE food == true AND discord_id = \"d-${message.author.id}\"
		GROUP BY item_name`;

	let query = new Promise((resolve, reject) => {
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});

	query.then(rows => {
		console.log(rows[0]);
		let foodEntries = `${emotes["thrifty_bitz"]} Thrifty Bitz (Unlimited)\n`;
		rows.forEach(row => {
			foodEntries += `${emotes[row.item_name.toLowerCase().split(' ').join('_')]} ${row.item_name} (${row.count})\n`;
		});

		const foodEmbed = new Discord.MessageEmbed()
			.attachFiles(["images/logos/Button_Goodies.png", "images/logos/atsume.jpg"])
			.setAuthor("Food Inventory", "attachment://atsume.jpg")
			.setThumbnail("attachment://Button_Goodies.png")
			.setDescription("> Place food in the yard using:\n> **%food [food-name]**")
			.addField('\u200b', `**Inventory**\n${foodEntries}`);

		message.channel.send(foodEmbed);
	});
}