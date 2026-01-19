const { schedule } = require("@netlify/functions");

// Runs every hour on published deploys.
// It calls the app endpoint: /api/push/auto (low stock + due orders)
const handler = async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!siteUrl) {
    console.error("[push-auto] Missing site URL env (URL/DEPLOY_PRIME_URL)");
    return { statusCode: 500, body: "Missing site URL" };
  }

  const cronKey = process.env.PUSH_CRON_KEY;
  const endpoint = `${siteUrl.replace(/\/$/, "")}/api/push/auto`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: cronKey ? { "x-cron-key": cronKey } : {},
    });

    const text = await res.text();
    console.log("[push-auto] status:", res.status);
    console.log("[push-auto] body:", text);

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("[push-auto] error:", e);
    return { statusCode: 500, body: "error" };
  }
};

module.exports.handler = schedule("@hourly", handler);
