import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { parseOFixUrl } from "./util.js";

const BASE_URL = await parseOFixUrl();

const FETCH_TIMEOUT = 30000;

async function fetchHtml() {
  const res = await fetch(BASE_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch updates: HTTP ${res.status}`);
  }
  return iconv.decode(Buffer.from(await res.arrayBuffer()), "win1251");
}

export async function parseOnlineFixUpdates() {
  const html = await fetchHtml();

  let games = [];
  if (html) {
    const $ = cheerio.load(html);
    for (const el of $(".article.clr").toArray().reverse()) {
      const content = $(el).find(".article-content");
      const a = content.children("a").first();
      games.push({
        title: a.find(".title").text().trim(),
        link: a.attr("href"),
        reason: content.children(".edit").text().trim() || "initial release",
      });
    }
  }
  if (games.length === 0) {
    throw new Error(
      "Found 0 releases on the 1st page, the website might have changed its layout",
    );
  }
  return games;
}
