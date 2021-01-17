// import modules
const browse = require("./goodies_browse.js");
const info = require("./goodies_info.js");

// define bot command
module.exports = (message) => {
	// input case: user is browsing invetory of goodies items
	if (message.content.match(/^%(g|goodies)$/i)) {
		browse(message);
	}
	// input case: user is attempting to place a goodie item
	else if (message.content.match(/^%(g|goodies) [a-zA-Z0-9]/i)) {
		info(message);
	}
}