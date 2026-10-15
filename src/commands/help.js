
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  name: "help",
  aliases: ["h"],
  category: "Information & Help",
  description: "View Ticck's available commands.",
  usage: ".help [command]",

  async execute(message, args, { commands, prefix }) {
    const installed = [...new Set(commands.values())]
      .sort((a, b) => a.name.localeCompare(b.name));

    if (args[0]) {
      const name = args[0].replace(/^\./, "").toLowerCase();
      const cmd = commands.get(name);

      if (!cmd) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#ED4245")
              .setTitle("❌ Command Not Found")
              .setDescription(`\`${prefix}${name}\` is not installed yet.`)
          ]
        });
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`📖 ${prefix}${cmd.name}`)
            .setDescription(cmd.description || "No description.")
            .addFields(
              { name: "Category", value: cmd.category || "General" },
              { name: "Usage", value: `\`${cmd.usage || prefix + cmd.name}\`` }
            )
            .setFooter({ text: "Ticck • Help Centre" })
        ]
      });
    }

    let page = 0;
    const perPage = 10;
    const totalPages = Math.max(1, Math.ceil(installed.length / perPage));

    function createEmbed() {
      const listed = installed.slice(page * perPage, (page + 1) * perPage);

      return new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📚 Ticck — Help Centre")
        .setDescription(
          `**Prefix:** \`${prefix}\`\n` +
          `**Installed commands:** ${installed.length}\n\n` +
          (listed.map(c =>
            `**${prefix}${c.name}** — ${c.description || "No description"}`
          ).join("\n") || "No commands available.") +
          `\n\nUse \`.help command\` for more information.`
        )
        .setFooter({ text: `Ticck • Page ${page + 1}/${totalPages}` })
        .setTimestamp();
    }

    function buttons() {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("help_previous")
          .setLabel("◀ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("help_next")
          .setLabel("Next ▶")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= totalPages - 1)
      );
    }

    const sent = await message.reply({
      embeds: [createEmbed()],
      components: totalPages > 1 ? [buttons()] : []
    });

    if (totalPages === 1) return;

    const collector = sent.createMessageComponentCollector({
      time: 120000
    });

    collector.on("collect", async interaction => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: "❌ This isn't your help menu.",
          ephemeral: true
        });
      }

      if (interaction.customId === "help_next") page++;
      if (interaction.customId === "help_previous") page--;

      await interaction.update({
        embeds: [createEmbed()],
        components: [buttons()]
      });
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  }
};
