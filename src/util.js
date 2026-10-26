import "dotenv/config";

export async function parseOFixUrl() {
  let baseUrl = "";
  try {
    if (process.env.OFIX_BASE_URL) {
      baseUrl = process.env.OFIX_BASE_URL;
      if (/[\/\\]$/.test(baseUrl)) {
        baseUrl = baseUrl.slice(0, baseUrl.length - 1);
      }
      URL.parse(baseUrl);
    } else {
      baseUrl = "https://online-fix.me";
    }
    const testRes = await fetch(OFIX_BASE_URL);
    if (!testRes.ok)
      throw new Error(
        `Could not access ${baseUrl} during the test, status code: ${testRes.status}`,
      );
    return baseUrl;
  } catch (e) {
    console.error(e.message);
    return;
  }
}
