import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { fail, handleApiError, ok } from "@/server/http";
import { syncDirectoryToLinq } from "@/server/linq-directory";

/**
 * Re-sends every merchant and every Stellar order to Linq, on demand.
 *
 * The same sync runs by itself at boot; this is for forcing it — after a Linq
 * outage, or to repair its records. Guarded by the Linq webhook secret, which
 * only this deployment and Linq hold:
 *
 *   curl -X POST https://<this app>/api/admin/sync-linq -H "x-sync-key: $LINQ_OFFRAMP_WEBHOOK_SECRET"
 */
export async function POST(request: Request) {
  try {
    const secret = env.LINQ_OFFRAMP_WEBHOOK_SECRET ?? "";
    const provided = request.headers.get("x-sync-key") ?? "";
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) return fail("Unauthorized.", 401);

    return ok(await syncDirectoryToLinq({ force: true }));
  } catch (error) {
    return handleApiError(error);
  }
}
