import * as cheerio from "cheerio";
import * as iconv from "iconv-lite";
import { Readable } from "node:stream";
import { parseOFixUrl } from "./util.js";

const BASE_URL = parseOFixUrl();
console.log(BASE_URL);

async function fetchHtml(html) {
  return new Promise(async (resolve, reject) => {
    const res = await fetch(BASE_URL + "/guides_upd.html");
    Readable.fromWeb(res.body)
      .pipe(iconv.decodeStream("win1251"))
      .collect(function (err, decodedBody) {
        if (err) reject(err);
        resolve(decodedBody);
      });
  });
}

export async function parseOnlineFixUpdates() {
  const html = await fetchHtml();

  let games = [];
  if (html) {
    const $ = cheerio.load(html);
    const news = $("div .article.clr").children();
    const newsArray = news.toArray();
    for (let i = 0; i < newsArray.length; i += 2) {
      const img = newsArray[i].children.find(
        (child) => child.attribs?.class === "img",
      );
      const title = img.children
        .find((child) => child.attribs?.alt)
        .attribs.alt.trim();
      const link = img.attribs.href;
      const data = newsArray[i + 1].children
        .find((child) => child.attribs?.class === "edit")
        .children[1].data.trim();
      games.push({
        title,
        link: BASE_URL + link,
        reason: data,
      });
    }
  }

  return games;
}
