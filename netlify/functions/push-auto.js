// Netlify Scheduled Function (no extra dependencies)
// Runs every hour and triggers the app endpoint that checks:
// - low stock
// - orders due (1 day before + same day)

exports.config = {
  schedule: "@hourly",
};

exports.handler = async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!siteUrl) {
    console.error("[push-auto] Missing site URL env (URL/DEPLOY_PRIME_URL)");
    return { statusCode: 500, body: "Missing site URL" };
  }

  const cronKey = process.env.PUSH_CRON_KEY;
  const base = siteUrl.replace(/\/$/, "");
  const endpoint = cronKey
    ? `${base}/api/push/auto?key=${encodeURIComponent(cronKey)}`
    : `${base}/api/push/auto`;

  try {
    const res = await fetch(endpoint, { method: "GET" });
    const text = await res.text();
    console.log("[push-auto] status:", res.status);
    console.log("[push-auto] body:", text);
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    console.error("[push-auto] error:", e);
    return { statusCode: 500, body: "error" };
  }
};
