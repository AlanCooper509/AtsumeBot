// import modules
const browse = require("./food_browse.js");
const place = require("./food_place.js");

// define bot command
module.exports = (message) => {
	// input case: user is browsing invetory of food items
	if (message.content.match(/^%(f|food)$/i)) {
		browse(message);
	}
	// input case: user is attempting to place a food item
	else if (message.content.match(/^%(f|food) [a-zA-Z0-9]/i)) {
		place(message);
	}
}