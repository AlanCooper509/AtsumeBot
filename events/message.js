// import modules
const shop = require("../commands/shop.js");
const reply = require("../commands/reply.js");

// define listener(s)
module.exports = (client, message) => {
	input = message.content.toLowerCase();

	if (input.startsWith("shop") || input.startsWith("s")) {
		shop(message);
	}

	if (message.content === "ping") {
		reply(message, "Pong!");
	}
}