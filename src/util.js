import "dotenv/config";

export function parseOFixUrl() {
  let baseUrl = "";
  try {
    if (process.env.OFIX_BASE_URL) {
      baseUrl = process.env.OFIX_BASE_URL;
      if (/[\/\\]$/.test(baseUrl)) {
        baseUrl = baseUrl.slice(0, baseUrl.length - 1);
      }
    }
    URL.parse(baseUrl);
    return baseUrl;
  } catch (e) {
    console.error(e.message);
    return;
  }
}
