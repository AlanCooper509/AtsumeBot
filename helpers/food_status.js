const sqlite3 = require("sqlite3").verbose();
const emotes = require("../helpers/emotes.js");

let yardStatus = function(resolve, reject) {
	let db = new sqlite3.Database("memory.s3db");

	// 28,800 seconds (8 hours) for Frisky Bitz (not found in GoodiesShop)
	let sql = `SELECT item_name, outside,
	CASE WHEN time_limit IS NULL
		THEN 28800 - (strftime('%s', 'now') - strftime('%s', timestamp))
		ELSE time_limit - (strftime('%s', 'now') - strftime('%s', timestamp))
	END AS time_left
	FROM YardData AS x LEFT JOIN GoodiesShop AS y ON x.item_name == y.name
	WHERE item_type == "Food_Other"
	ORDER BY outside DESC`;

	db.all(sql, [], (err, rows) => {
		db.close();
		if (err) reject(err);
		else resolve(rows);
	});
}

let addFields = function(embed, foods) {
	// two food slots: one indoors, one outdoors
	let placed_outdoors = false;
	let placed_indoors = false;
	foods.forEach(food => {
		if (food.outside) placed_outdoors = true;
		else placed_indoors = true;
		let location = food.outside ? "Outdoors 🏕️" : "Indoors 🏠";
		let timer = food.time_left > 0 ? new Date(food.time_left * 1000).toISOString().substr(11, 8): "No time";
		embed.addField(location, `${emotes[food.item_name.toLowerCase().split(' ').join('_')]} ${food.item_name}\n${timer} remaining`, true);
	});
	
	// edge case: first time placing food outdoors
	if (!placed_outdoors) {
		embed.addField("Outdoors 🏕️", `No food currently placed`, true);
	}
	// edge case: first time placing food indoors
	if (!placed_indoors) {
		embed.addField("Indoors 🏠", `No food currently placed`, true);
	}
	
}

module.exports = {
	yardStatus: yardStatus,
	addFields: addFields
}