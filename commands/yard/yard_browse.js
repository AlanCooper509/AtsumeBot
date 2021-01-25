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
		let sql = `SELECT name, size, outside FROM YardData INNER JOIN GoodiesData ON item_name == name WHERE item_type != \"Food_Other\" AND discord_id = \"d-${message.author.id}\"`
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
	const yardSizeQuery = new Promise((resolve, reject) => {
		let sql = `SELECT COUNT() AS count FROM PurchaseLog WHERE discord_id = \"d-${message.author.id}\" AND item_name == \"Yard Expansion\" GROUP BY item_name`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	});
	const foodQuery = new Promise(food_status.yardStatus);

	Promise.all([userQuery, yardQuery, foodQuery, yardSizeQuery]).then(outputs => {
		let userStats = outputs[0];
		let serverStats = outputs[1];
		let yardFoods = outputs[2];
		let expansions = outputs[3];
		db.close();

		// user information
		let userOutdoorsItemRows = [];
		let userIndoorsItemRows = [];
		let slotsFilled = 0;
		userStats.forEach(goodie => {
			let row = `${goodie.size == 'L' ? emotes.large : emotes.small} ${goodie.name}`;
			if (goodie.outside) userOutdoorsItemRows.push(row);
			else userIndoorsItemRows.push(row);
			slotsFilled += goodie.size == 'L' ? 2 : goodie.size == 'S' ? 1 : 0;
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
			.setDescription("> Place or Put Away goodies using:\n> **%yard [goodie-name]**\n> \n> See Yard Activity using:\n> **%cats**")
			.addField("\u200b", `__**${message.member.displayName}**'s Goodies__ **(${slotsFilled}/${expansions.count + 1} Slots Filled)**`)
			.addField("Outdoors :camping:", userOutdoorsItems, true)
			.addField("Indoors :house:", userIndoorsItems, true)
			.addField("\u200b", `__**${message.guild.name}**'s Goodies__ **(${outsideCount + insideCount} Goodies Placed)**`)
			.addField("Outdoors :camping:", `**${outsideCount}** ${outsideCount > 1 ? "Goodies" : "Goodie"} Placed`, true)
			.addField("Indoors :house:", `**${insideCount}** ${insideCount > 1 ? "Goodies" : "Goodie"} Placed`, true)
			.addField("\u200b", "Currently, the following foods are placed in the yard:");
		food_status.addFields(yardEmbed, yardFoods);
		message.channel.send(yardEmbed);
	});
}