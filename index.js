// import modules
require("dotenv").config()
const Discord = require("discord.js")

// instantiate client
const client = new Discord.Client()

// define listeners
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("message", (msg) => {
  if (msg.content === "ping") {
    msg.reply("Pong!")
  }
})

// login to server
client.login(process.env.BOT_TOKEN)