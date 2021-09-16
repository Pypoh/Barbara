const config = require("./config.json");
const { Client, Intents, Collection } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: ["GUILDS", "GUILD_VOICE_STATES"],
  disableMentions: "everyone",
  restTimeOffset: 0,
});

client.player = new Player(client);
registerPlayerEvents(client.player);

const creator = new SlashCreator({
  applicationID: process.env.DISCORD_CLIENT_ID,
  token: process.env.DISCORD_CLIENT_TOKEN,
});

client.commands = new Collection();
client.queue = new Map();
const cooldowns = new Collection();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

client.on("ready", () => {
  console.log("This bot is online!");
});
client.on("warn", (info) => console.log(info));
client.on("error", console.error);

const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on("message", (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    client.commands.get("ping").execute(message, args);
  } else if (command === "play") {
    client.commands.get("play").execute(message, args);
  } else if (command === "leave") {
    client.commands.get("leave").execute(message, args);
  }
});

client.login(config.token);
