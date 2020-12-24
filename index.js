// import modules
require("dotenv").config();
const fs = require("fs");
const Discord = require("discord.js");

// instantiate client
const client = new Discord.Client();

// define listener(s)
fs.readdir("./events/", (err, files) => {
	files.forEach((file) => {
		const eventHandler = require(`./events/${file}`);
		const eventName = file.split(".")[0];
		client.on(eventName, (arg) => eventHandler(client, arg));
	});
});

// login to server
client.login(process.env.BOT_TOKEN);