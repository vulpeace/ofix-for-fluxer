import { Client, ErrorCodes, Events, PermissionFlags } from "@fluxerjs/core";
import { parseOnlineFixUpdates } from "./parser.js";
import * as db from "./db.js";
import { setTimeout as sleep } from "node:timers/promises";
import "dotenv/config";

const POLL_INTERVAL = 300000;
const MESSAGE_INTERVAL = 1000;
const MAX_SEND_ATTEMPTS = 5;

let lastUpdate = [];

function isChannelGone(e) {
  return (
    e.code === ErrorCodes.ChannelNotFound ||
    (e.statusCode ?? e.cause?.statusCode) === 404
  );
}

function rateLimitDelay(e) {
  const err = e.statusCode === 429 ? e : e.cause;
  if (err?.statusCode !== 429) return undefined;
  return Math.max((err.retryAfter ?? 0) * 1000, MESSAGE_INTERVAL);
}

async function sendWithRetry(channel, content) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await channel.send(content);
    } catch (e) {
      const delay = rateLimitDelay(e);
      if (delay === undefined || attempt >= MAX_SEND_ATTEMPTS) throw e;
      await sleep(delay);
    }
  }
}

async function dropDeletedChannels(client) {
  for (const { guildId, channelId } of db.getSubscriptions()) {
    try {
      await client.channels.fetch(channelId);
    } catch (e) {
      if (isChannelGone(e)) {
        db.removeGuild(guildId);
        console.log(`Removed deleted channel ${channelId} (guild ${guildId})`);
      } else {
        console.error(`Failed to check channel ${channelId}: ${e.message}`);
      }
    }
  }
}

async function broadcast(client) {
  await Promise.all(
    db
      .getPendingSubscriptions()
      .map(async ({ guildId, channelId, needsRetry }) => {
        try {
          const channel = await client.channels.resolve(channelId);
          while (needsRetry.length > 0) {
            const game = needsRetry[0];
            await sendWithRetry(
              channel,
              `Update:\n- title: ${game.title}\n- link: ${game.link}\n- reason: ${game.reason}`,
            );
            needsRetry.shift();
            db.setNeedsRetry(guildId, needsRetry);
            await sleep(MESSAGE_INTERVAL);
          }
        } catch (e) {
          if (isChannelGone(e)) {
            db.removeGuild(guildId);
            console.log(
              `Removed deleted channel ${channelId} (guild ${guildId})`,
            );
          } else {
            console.error(
              `Failed to notify channel ${channelId}: ${e.message}`,
            );
          }
        }
      }),
  );
}

async function pollRecursively(client) {
  try {
    const updatedGames = await parseOnlineFixUpdates();
    const newGames = updatedGames.filter(
      (updatedGame) =>
        !lastUpdate ||
        lastUpdate.length === 0 ||
        !lastUpdate.find(
          (game) =>
            game.title === updatedGame.title &&
            game.reason === updatedGame.reason,
        ),
    );

    if (newGames.length > 0) {
      lastUpdate = updatedGames;
      db.setUpdate(lastUpdate, newGames);
    }
    await broadcast(client);
  } catch (e) {
    console.error(e.message);
  } finally {
    setTimeout(pollRecursively, POLL_INTERVAL);
  }
}

async function handleCommand(message) {
  if (message.author.bot) return;
  const command = message.content.trim();
  if (command !== "!online-fix.set" && command !== "!online-fix.unset") return;

  if (!message.guildId) {
    await message.reply("This command only works in servers");
    return;
  }

  const guild = await message.resolveGuild();
  const member = await guild.members.resolve(message.author.id);
  if (!member.permissions.has(PermissionFlags.ManageGuild)) {
    await message.reply("You need the Manage Server permission to do that");
    return;
  }

  if (command === "!online-fix.unset") {
    const removed = db.removeGuild(message.guildId);
    await message.reply(
      removed
        ? "Will no longer notify about updates in this server"
        : "No channel is configured in this server",
    );
    return;
  }

  const channel = await message.resolveChannel();
  if (!channel.isTextBased()) {
    await message.reply(`Invalid channel`);
    return;
  }

  db.setSubscription(message.guildId, channel.id);
  await message.reply(`Will notify about updates in channel ${channel.id}!`);
}

try {
  const instanceUrl = process.env.FLUXER_INSTANCE ?? "https://fluxer.com";
  const client = await Client.fromDiscovery(instanceUrl, {
    waitForGuilds: true,
  });

  client.on(Events.Error, (e) => {
    console.error(`Fluxer client error: ${e.message}`);
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

    await dropDeletedChannels(client);
    lastUpdate = db.getLastUpdate();

    client.on(Events.MessageCreate, async (message) => {
      try {
        await handleCommand(message);
      } catch (e) {
        console.error(`Failed to handle command: ${e.message}`);
      }
    });

    client.on(Events.ChannelDelete, (channel) => {
      if (db.removeChannel(channel.id)) {
        console.log(`Removed deleted channel ${channel.id}`);
      }
    });

    client.on(Events.GuildDelete, (guild) => {
      if (db.removeGuild(guild.id)) {
        console.log(`Removed guild ${guild.id} the bot is no longer in`);
      }
    });

    console.log(
      `Notifying ${db.getSubscriptions().length} channel(s), send\n` +
        `
      !online-fix.set
      ` +
        "\nin a channel you want the bot to send updates to",
    );

    pollRecursively(client);
  });

  const token = process.env.FLUXER_BOT_TOKEN;
  await client.login(token);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
