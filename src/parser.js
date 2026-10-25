import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { parseOFixUrl } from "./util.js";

const BASE_URL = parseOFixUrl();

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
    const news = $("div .news-flex").children();
    const newsArray = news.toArray();
    newsArray.reverse();
    for (let item of newsArray) {
      const article = item.children.find(
        (child) => child.attribs?.class === "article clr",
      );
      const articleContent = article.children.find(
        (child) => child.attribs?.class === "article-content",
      );
      const a = articleContent.children.find((child) => child.tagName === "a");
      const edit = articleContent.children.find(
        (child) => child.attribs?.class === "edit",
      );
      const title = a.children
        .find((child) => child.attribs?.class === "title")
        .children[0].data.trim();
      const link = a.attribs.href;
      const data = edit.children
        .find((child) => child.type === "text")
        .data.trim();
      games.push({
        title,
        link: BASE_URL + link,
        reason: data || "initial release on Online Fix",
      });
    }
  }
  return games;
}
