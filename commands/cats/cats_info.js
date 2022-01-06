// import modules
const Discord = require("discord.js");
const sqlite3 = require("sqlite3").verbose();

// define bot command
module.exports = (message) => {
	let tokens = message.content.split(' ');
	tokens.shift();
	let catInput = tokens.join(' ').replace(/['"]/g, ''); // no SQL injection today!

	// open db
	let db = new sqlite3.Database("memory.s3db");

	// load cat info
	let catQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM CatData WHERE LOWER(name) = \"${catInput.toLowerCase()}\"`
		db.get(sql, [], (err, row) => {
			if(err) reject(err);
			else resolve(row);
		});
	});
	// load visits info
	let visitQuery = new Promise((resolve, reject) => {
		let sql = `SELECT * FROM YardVisits WHERE cat_id = (SELECT id FROM CatData WHERE LOWER(name) = \"${catInput.toLowerCase()}\")`
		db.all(sql, [], (err, rows) => {
			if(err) reject(err);
			else resolve(rows);
		});
	});
	Promise.all([catQuery, visitQuery]).then(results => {
		let catInfo = results[0];
		let visitInfo = results[1];
		console.log(catInfo);
		console.log(visitInfo);
		
		if (typeof catInfo === "undefined") {
			message.channel.send(`Could not find **${catInput}** in the **Catbook**.`);
		} else if (visitInfo.length <= 0) {
			message.channel.send(`**${catInfo.name}** has not been spotted yet...`);
		} else {
			// info about cat...
			top3Goodies = ["• baseball"];
			memento = "???";
			userVisits = 1;
			serverVisits = 1;
			poseName = `images/poses/${catInfo.regular ? catInfo.file_name : "img_neko_special"}/`;
			poseNumber = catInfo.regular ? 5 : catInfo.special_index;

			// name, personality, power level, visits, appearance, top 3 goodies used, memento obtained?, and album....
			const catEmbed = new Discord.MessageEmbed()
				.attachFiles(
					["images/logos/Button_Catbook.png", `images/faces/${catInfo.img_face}.png`, `${poseName + poseNumber}.png`])
				.setAuthor(`${catInfo.name}`, `attachment://${catInfo.img_face}.png`)
				.setThumbnail("attachment://Button_Catbook.png")
				.setDescription("> See the cat album using:\n> **%cats album**\n> \n> See cats currently in the yard using:\n> **%cats**\n\n")
				.addField("\u200b\nAppearance", catInfo.appearance, true)
				.addField("\u200b\nPersonality", catInfo.personality, true)
				.addField("\u200b\nPower Level", catInfo.power_level, true)
				.addField("\u200b\nTop 3 Goodies Used", top3Goodies)
				.addField("\u200b\nMemento", memento)
				.addField('\u200b',
					`**${catInfo.name}** has visited ${message.member.displayName} **${userVisits}** ${userVisits == 1 ? "time" : "times"}, ` +
					`and ${message.guild.name}'s Yard **${serverVisits}** ${serverVisits == 1 ? "time" : "times"} in total.`)
				.setImage(`attachment://${poseNumber}.png`);

		message.channel.send(catEmbed);
		}
		db.close();
	});
}