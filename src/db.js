import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";

mkdirSync("./data", { recursive: true });
const db = new DatabaseSync("./data/bot.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    guild_id   TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const upsertSubscription = db.prepare(`
  INSERT INTO subscriptions (guild_id, channel_id) VALUES (?, ?)
  ON CONFLICT (guild_id) DO UPDATE SET channel_id = excluded.channel_id
`);
const deleteByGuild = db.prepare(
  "DELETE FROM subscriptions WHERE guild_id = ?",
);
const deleteByChannel = db.prepare(
  "DELETE FROM subscriptions WHERE channel_id = ?",
);
const selectSubscriptions = db.prepare(
  "SELECT guild_id AS guildId, channel_id AS channelId FROM subscriptions",
);
const selectState = db.prepare("SELECT value FROM state WHERE key = ?");
const upsertState = db.prepare(`
  INSERT INTO state (key, value) VALUES (?, ?)
  ON CONFLICT (key) DO UPDATE SET value = excluded.value
`);

export function setSubscription(guildId, channelId) {
  upsertSubscription.run(guildId, channelId);
}

// Both return whether a subscription was actually removed
export function removeGuild(guildId) {
  return deleteByGuild.run(guildId).changes > 0;
}

export function removeChannel(channelId) {
  return deleteByChannel.run(channelId).changes > 0;
}

export function getSubscriptions() {
  return selectSubscriptions.all();
}

export function getLastUpdate() {
  const row = selectState.get("lastUpdate");
  return row ? JSON.parse(row.value) : undefined;
}

export function setLastUpdate(games) {
  upsertState.run("lastUpdate", JSON.stringify(games));
}
