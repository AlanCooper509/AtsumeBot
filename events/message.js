// import modules
const shop = require("../commands/shop/shop.js");
const food = require("../commands/food/food.js");
const goodies = require("../commands/goodies/goodies.js");
const yard = require("../commands/yard/yard.js");
const sqlite3 = require("sqlite3").verbose();

// define listener(s)
module.exports = (client, message) => {

	// sequentially run the following helper functions
	let db = new sqlite3.Database("memory.s3db");
	const userQuery = new Promise(checkUserStatus);
	userQuery.then(addIfNewUser).then(handleMessage);
	
	// helper functions
	function checkUserStatus(resolve, reject) {
		let sql = `SELECT * FROM PlayerData WHERE discord_id == \"d-${message.author.id}\"`;
		db.get(sql, [], (err, row) => {
			if (err) reject(err);
			else resolve(row);
		});
	}
	function addIfNewUser(row) {
		if(typeof row == "undefined") {
			const optionallyAdd = new Promise((resolve, reject) => {
				// update fields here for instantiating PlayerData row as the corresponding table is updated
				let headers = ["discord_id"];
				let values = [`\"d-${message.author.id}\"`];
				
				let sql = `INSERT INTO PlayerData (${headers.join(', ')}) VALUES (${values.join(', ')})`;
				db.run(sql, [], err => {
					if (err) reject(err);
					else {
						resolve();
					}
				});
			});
			return optionallyAdd;
		}
	}
	function handleMessage() {
		db.close();

		// proceed with processing request
		if (message.content.match(/^%(s|shop)/i)) {
			shop(message);
		}
		else if (message.content.match(/^%(f|food)/i)) {
			food(message);
		}
		else if (message.content.match(/^%(g|goodies)/i)) {
			goodies(message);
		}
		else if (message.content.match(/^%(y|yard)/i)) {
			yard(message);
		}
	}
}