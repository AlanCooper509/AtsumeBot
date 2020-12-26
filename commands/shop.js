// import modules
const browse = require("./shop_browse.js");
const purchase = require("./shop_purchase.js");

// define bot command
module.exports = (message) => {
	// input case: user is browsing items to purchase
	if (message.content.match(/^%(s|shop)$/i)) {
		browse(message);
	}
	// input case: user is attempting to purchase an item
	else if (message.content.match(/^%(s|shop) [a-zA-Z0-9]/i)) {
		purchase(message);
	}
}