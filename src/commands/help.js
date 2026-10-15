
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const sections = [
  ["📚 Information & Help", ["information", "help", "core"]],
  ["🛡️ Moderation & Logs", ["moderation", "automod", "security", "logs", "cases"]],
  ["⚙️ Server & Roles", ["server", "roles", "permissions", "channels"]],
  ["👋 Welcome & Community", ["welcome", "community", "social", "profiles"]],
  ["🎫 Tickets & Support", ["ticket", "support"]],
  ["🎉 Giveaways & Events", ["giveaway", "event"]],
  ["💰 Economy & Shop", ["economy", "shop", "bank", "wallet", "inventory"]],
  ["🏢 Businesses & Jobs", ["business", "jobs"]],
  ["⭐ XP & Levels", ["xp", "level", "rewards"]],
  ["🎰 Fun & Gambling", ["fun", "games", "gambling", "casino", "mines", "chicken"]],
  ["🎵 Music", ["music"]],
  ["🔧 Utilities & Owner", ["utilities", "utility", "owner", "control"]]
];

module.exports = {
  name: "help",
  aliases: ["h"],
  category: "Information & Help",
  description: "Open the Ticck help centre.",
  usage: ".help [command]",

  async execute(message, args, { commands, prefix }) {

    const installed = [...new Set(commands.values())]
      .sort((a, b) => a.name.localeCompare(b.name));

    const aliasCount = installed.reduce(
      (count, cmd) => count + (cmd.aliases || []).length, 0
    );

    // Count registered global and server slash commands
    const slashResults = await Promise.allSettled([
      message.client.application.commands.fetch(),
      message.guild.commands.fetch()
    ]);

    let slashCount = "Unavailable";

    if (slashResults.every(r => r.status === "fulfilled")) {
      const ids = new Set();

      for (const result of slashResults) {
        for (const cmd of result.value.values()) {
          ids.add(cmd.id);
        }
      }

      slashCount = ids.size;
    }

    // Detailed command information
    if (args.length) {
      const name = args[0].toLowerCase().replace(/^\./, "");
      const cmd = commands.get(name);

      if (!cmd) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#ED4245")
              .setTitle("❌ Command Not Found")
              .setDescription(
                `\`${prefix}${name}\` is not installed yet.`
              )
          ]
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`📖 ${prefix}${cmd.name}`)
        .setDescription(cmd.description || "No description.")
        .addFields(
          {
            name: "📁 Category",
            value: cmd.category || "General"
          },
          {
            name: "⌨️ Usage",
            value: `\`${cmd.usage || prefix + cmd.name}\``
          },
          {
            name: "🔗 Aliases",
            value: (cmd.aliases || []).length
              ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(", ")
              : "None"
          }
        )
        .setFooter({ text: "Ticck • Command Information" })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // 13-page help menu
    let page = 0;
    const totalPages = 13;

    function getSection(cmd) {
      const category = (cmd.category || "").toLowerCase();

      const found = sections.findIndex(section =>
        section[1].some(keyword => category.includes(keyword))
      );

      return found === -1 ? 11 : found;
    }

    function makeEmbed() {
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTimestamp()
        .setFooter({
          text: `Ticck • Page ${page + 1} of ${totalPages}`
        });

      // Page 1: Home statistics
      if (page === 0) {
        return embed
          .setTitle("📚 Ticck — Help Centre")
          .setDescription(
            "Welcome to **Ticck**, your all-in-one Discord bot!\n\n" +
            `**Prefix:** \`${prefix}\`\n` +
            "**Help pages:** 13\n\n" +
            "Use the buttons below to explore the categories."
          )
          .addFields(
            {
              name: "📚 Planned Commands",
              value: "**550**",
              inline: true
            },
            {
              name: "✅ Installed Commands",
              value: `**${installed.length}**`,
              inline: true
            },
            {
              name: "⚡ Slash Commands",
              value: `**${slashCount}**`,
              inline: true
            },
            {
              name: "🔗 Aliases",
              value: `**${aliasCount}**`,
              inline: true
            },
            {
              name: "📖 Command Information",
              value: `Use \`${prefix}help ban\` for details about an installed command.`,
              inline: false
            }
          );
      }

      // Pages 2–13: Command categories
      const sectionIndex = page - 1;
      const section = sections[sectionIndex];

      const categoryCommands = installed.filter(
        cmd => getSection(cmd) === sectionIndex
      );

      let description = "";
      let shown = 0;

      for (const cmd of categoryCommands) {
        const line = `\`${prefix}${cmd.name}\` — ${cmd.description || "No description"}\n`;

        if (description.length + line.length > 3500) break;

        description += line;
        shown++;
      }

      if (!description) {
        description = "No commands installed in this category yet.";
      }

      if (shown < categoryCommands.length) {
        description += "\nMore commands will be shown as this menu is expanded.";
      }

      return embed
        .setTitle(section[0])
        .setDescription(description)
        .addFields({
          name: "📊 Installed in Category",
          value: `${categoryCommands.length}`,
          inline: true
        });
    }

    function makeButtons() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticck_first")
          .setLabel("⏮ First")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId("ticck_previous")
          .setLabel("◀ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),

        new ButtonBuilder()
          .setCustomId("ticck_next")
          .setLabel("Next ▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1),

        new ButtonBuilder()
          .setCustomId("ticck_last")
          .setLabel("Last ⏭")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );
    }

    const sent = await message.reply({
      embeds: [makeEmbed()],
      components: [makeButtons()]
    });

    const collector = sent.createMessageComponentCollector({
      time: 120000
    });

    collector.on("collect", async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "❌ This help menu belongs to another user.",
          flags: MessageFlags.Ephemeral
        });
      }

      switch (interaction.customId) {
        case "ticck_first":
          page = 0;
          break;
        case "ticck_previous":
          page = Math.max(0, page - 1);
          break;
        case "ticck_next":
          page = Math.min(totalPages - 1, page + 1);
          break;
        case "ticck_last":
          page = totalPages - 1;
          break;
      }

      await interaction.update({
        embeds: [makeEmbed()],
        components: [makeButtons()]
      });
    });

    collector.on("end", async () => {
      await sent.edit({ components: [] }).catch(() => {});
    });
  }
};
