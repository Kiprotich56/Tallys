// CLIENT_URL = the frontend (browser-facing) origin. Used both for CORS
// (must exactly match the origin the browser sends requests from, or the
// session cookie is silently dropped and every authenticated request comes
// back 401) and for building user-facing links in emails (verification,
// password reset).
//
// Falls back to APP_URL, then to the Replit dev domain, then to localhost
// for local development. In production, CLIENT_URL (or APP_URL) MUST be set
// to the real deployed frontend origin — otherwise CORS silently rejects the
// browser's credentialed requests.
export const CLIENT_URL =
  process.env.CLIENT_URL ??
  process.env.APP_URL ??
  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000");

if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL && !process.env.APP_URL) {
  // eslint-disable-next-line no-console
  console.error(
    `[client-url] Neither CLIENT_URL nor APP_URL is set in production. ` +
      `Falling back to "${CLIENT_URL}", which will NOT match the real frontend origin — ` +
      `CORS will reject credentialed requests and every authenticated call (login, booking, etc.) will 401. ` +
      `Set CLIENT_URL to the deployed frontend's origin.`,
  );
}
