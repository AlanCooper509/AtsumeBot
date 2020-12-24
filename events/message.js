// import modules
const reply = require("../commands/reply.js");

// define listener(s)
module.exports = (client, message) => {
	if (message.content === "ping") {
		reply(message, "Pong!");
	}
}