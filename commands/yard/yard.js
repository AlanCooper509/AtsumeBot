// import modules
const browse = require("./yard_browse.js");
const place = require("./yard_place.js");

// define bot command
module.exports = (message) => {
	// input case: user is viewing yard info
	if (message.content.match(/^%(y|yard)$/i)) {
		browse(message);
	}
	// input case: user is attempting to place/retrieve an item
	else if (message.content.match(/^%(y|yard) [a-zA-Z0-9]/i)) {
		place(message);
	}
}