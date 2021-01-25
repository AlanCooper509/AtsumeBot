// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../../helpers/emotes.js");
const status = require("../../helpers/food_status.js");

// define bot command
module.exports = (message) => {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	let inventoryQuery = new Promise((resolve, reject) => {
		// get count of food items
		let sql = `SELECT item_name, COUNT() AS count FROM PurchaseLog
			INNER JOIN GoodiesData ON item_name == name
			WHERE food == true AND discord_id = \"d-${message.author.id}\"
			GROUP BY item_name`;
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});

	let yardQuery = new Promise(status.yardStatus);
	
	Promise.all([inventoryQuery, yardQuery]).then(outputs => {
		let itemRows = outputs[0];
		let yardFoods = outputs[1];
		db.close();
		
		let foodEntries = `${emotes["thrifty_bitz"]} Thrifty Bitz (Unlimited)\n`;
		itemRows.forEach(row => {
			foodEntries += `${emotes[row.item_name.toLowerCase().split(' ').join('_')]} ${row.item_name} (${row.count})\n`;
		});
		
		const foodEmbed = new Discord.MessageEmbed()
			.attachFiles(["images/logos/Button_Goodies.png", "images/logos/atsume.jpg"])
			.setAuthor(`${message.member.displayName}'s Food Inventory`, "attachment://atsume.jpg")
			.setThumbnail("attachment://Button_Goodies.png")
			.setDescription("> Place food in the yard using one of:\n> **%food [food-name]**\n> **%yard [food-name]**")
			.addField('\u200b', `**__${message.member.displayName}'s Inventory__**\n${foodEntries}`)
			.addField("\u200b", "Currently, the following foods are placed in the yard:");

		status.addFields(foodEmbed, yardFoods);
		message.channel.send(foodEmbed);
	});
}