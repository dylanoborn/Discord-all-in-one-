
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events
} = require("discord.js");

const prefix = ".";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = new Map();

// Automatically load command files
const commandsPath = path.join(__dirname, "commands");

if (!fs.existsSync(commandsPath)) {
  fs.mkdirSync(commandsPath, { recursive: true });
}

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const command = require(path.join(commandsPath, file));

    if (
      typeof command.name === "string" &&
      typeof command.execute === "function"
    ) {
      commands.set(command.name.toLowerCase(), command);

      for (const alias of command.aliases || []) {
        commands.set(alias.toLowerCase(), command);
      }

      console.log(`✅ Loaded: .${command.name}`);
    }
  } catch (error) {
    console.error(`❌ Failed to load ${file}`, error);
  }
}

// Bot online
client.once(Events.ClientReady, readyClient => {
  console.log(`✅ Ticck is online as ${readyClient.user.tag}`);
  console.log(`📁 Loaded ${commandFiles.length} command files`);
  console.log(`🔧 Prefix: ${prefix}`);

  readyClient.user.setPresence({
    activities: [{ name: ".help | Ticck" }],
    status: "online"
  });
});

// Prefix command handler
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);

  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  const command = commands.get(commandName);

  if (!command) return;

  try {
    await command.execute(message, args, {
      client,
      prefix,
      commands,
      EmbedBuilder
    });
  } catch (error) {
    console.error(error);

    const embed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("❌ Ticck — Command Error")
      .setDescription(
        "Something went wrong while running this command."
      )
      .setFooter({ text: "Ticck • Error System" })
      .setTimestamp();

    await message.reply({ embeds: [embed] }).catch(console.error);
  }
});

// Secure bot token
const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ Missing DISCORD_TOKEN environment variable.");
  process.exitCode = 1;
} else {
  client.login(token).catch(console.error);
}
