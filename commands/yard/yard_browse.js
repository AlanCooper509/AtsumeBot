// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const emotes = require("../../helpers/emotes.js");
const food_status = require("../../helpers/food_status.js");

// define bot command
module.exports = (message) => {
	// open db
	let db = new sqlite3.Database("memory.s3db");

	let userQuery = new Promise((resolve, reject) => {
		// get data on user's items placed
		let sql = `SELECT name, size, outside FROM YardData INNER JOIN GoodiesShop ON item_name == name WHERE item_type != \"Food_Other\" AND discord_id = \"d-${message.author.id}\"`
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
	let yardQuery = new Promise((resolve, reject) => {
		// get data on guild's total items placed
		let sql = `SELECT COUNT() AS count, outside FROM YardData WHERE item_type != "Food_Other" GROUP BY outside`;
		db.all(sql, [], (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
	});
	let foodQuery = new Promise(food_status.yardStatus);

	Promise.all([userQuery, yardQuery, foodQuery]).then(outputs => {
		let userStats = outputs[0];
		let serverStats = outputs[1];
		let yardFoods = outputs[2];

		// user information
		let userOutdoorsItemRows = [];
		let userIndoorsItemRows = [];
		userStats.forEach(goodie => {
			let row = `${goodie.size == 'L' ? emotes.large : emotes.small} ${goodie.name}`;
			if (goodie.outside) userOutdoorsItemRows.push(row);
			else userIndoorsItemRows.push(row);
		});
		let userOutdoorsItems = userOutdoorsItemRows.join('\n') + '\u200b';
		let userIndoorsItems = userIndoorsItemRows.join('\n') + '\u200b';

		// server information
		let outsideCount = 0, insideCount = 0;
		serverStats.forEach(item => {
			if (item.outside) {
				outsideCount = item.count;
			} else {
				insideCount = item.count;
			}
		});

		// formatting data into embed
		const yardEmbed = new Discord.MessageEmbed()
			.attachFiles(["images/logos/Button_Yard.png", "images/logos/atsume.jpg"])
			.setAuthor(`${message.guild.name}'s Yard`, "attachment://atsume.jpg")
			.setThumbnail("attachment://Button_Yard.png")
			.setDescription("> Place or Put Away goodies using:\n> **%yard [goodie-name]**\n> \n> See yard activity using:\n> **%cats**")
			.addField("\u200b", `__**${message.member.displayName}**'s Goodies__ **(${userStats.length})**`)
			.addField("Outdoors :camping:", userOutdoorsItems, true)
			.addField("Indoors :house:", userIndoorsItems, true)
			.addField("\u200b", `__**${message.guild.name}**'s Goodies__ **(${outsideCount + insideCount})**`)
			.addField("Outdoors :camping:", `**${outsideCount}** Goodies Placed`, true)
			.addField("Indoors :house:", `**${insideCount}** Goodies Placed`, true)
			.addField("\u200b", "Currently, the following foods are placed in the yard:");
		food_status.addFields(yardEmbed, yardFoods);
		message.channel.send(yardEmbed);
	});
}