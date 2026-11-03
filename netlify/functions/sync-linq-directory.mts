// Sends Linq every merchant's onboarding state every 6 hours, as a safety net
// for any report that didn't arrive when the merchant changed
// (src/server/linq-directory.ts). The work happens in the app's own route.
export default async () => {
  const { URL: siteUrl, LINQ_OFFRAMP_WEBHOOK_SECRET: syncKey } = process.env;
  if (!siteUrl || !syncKey) {
    console.error("linq.directory.scheduled_sync_skipped: URL or LINQ_OFFRAMP_WEBHOOK_SECRET is not set");
    return;
  }
  const response = await fetch(`${siteUrl}/api/admin/sync-linq?force=false`, {
    method: "POST",
    headers: { "x-sync-key": syncKey },
  });
  if (!response.ok) console.error(`linq.directory.scheduled_sync_failed: ${response.status}`);
};

export const config = { schedule: "0 */6 * * *" };
