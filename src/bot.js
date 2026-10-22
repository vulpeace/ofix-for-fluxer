import { Client, Events } from "@fluxerjs/core";
import { parseOnlineFixUpdates } from "./parser.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import "dotenv/config";

let id = "";
let lastUpdate;
try {
  await mkdir("./data", { recursive: true });
  const config = JSON.parse(await readFile("./data/config.json", "utf-8"));
  id = config?.channelId;
  lastUpdate = JSON.parse(await readFile("./data/lastUpdate.json", "utf-8"));
} catch {}

async function startPolling(channel) {
  setInterval(async () => {
    try {
      const updatedGames = await parseOnlineFixUpdates();
      for (let updatedGame of updatedGames) {
        if (
          !lastUpdate ||
          !lastUpdate.find((game) => game.link === updatedGame.link)
        ) {
          await channel.send(
            `Update:\n- title: ${updatedGame.title}\n- link: ${updatedGame.link}\n- reason: ${updatedGame.reason}`,
          );
        }
      }
      lastUpdate = updatedGames;
      await writeFile(
        "./data/lastUpdate.json",
        JSON.stringify(lastUpdate),
        "utf-8",
      );
    } catch (e) {
      console.error(e.message);
    }
  }, 10000);
}

try {
  const instanceUrl = process.env.FLUXER_INSTANCE ?? "https://fluxer.com";
  const client = await Client.fromDiscovery(instanceUrl, {
    waitForGuilds: true,
  });

  client.once(Events.Ready, async () => {
    console.log(`Bot is in ${client.guilds.size} guild(s)`);
    for (const [, guild] of client.guilds) {
      console.log(`- ${guild.name}: ${guild.channels.size} channel(s)`);
    }

    const app = await client.fetchApplication();
    console.log(`Add to new guilds by following the link:\n
      ${instanceUrl}/oauth2/authorize?client_id=${app.id}&scope=bot&permissions=19456
    `);

    if (id) {
      const channel = await client.channels.fetch(id);

      if (!channel || !channel.isTextBased()) {
        console.error(`Invalid channel specified in config.json: ${id}`);
        process.exit(1);
      }

      await startPolling(channel);
      return;
    }

    console.log(
      "No channel configured, send\n" +
        `
      !online-fix.set
      ` +
        "\nin a channel you want the bot to send updates to",
    );

    const handler = async (message) => {
      if (message.author.bot) return;
      if (message.content.trim() !== "!online-fix.set") return;

      const channel = await message.resolveChannel();

      if (!channel || !channel.isTextBased()) {
        await message.reply(`Invalid channel`);
        return;
      }

      id = channel.id;
      await writeFile(
        "./data/config.json",
        JSON.stringify({ channelId: id }),
        "utf-8",
      );
      client.off(Events.MessageCreate, handler);

      await message.reply(`Will notify about updates in channel ${id}!`);
      await startPolling(channel);
    };
    client.on(Events.MessageCreate, handler);
  });

  const token = process.env.FLUXER_BOT_TOKEN;
  await client.login(token);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
