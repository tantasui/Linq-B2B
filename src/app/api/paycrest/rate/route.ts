import { handleApiError, ok } from "@/server/http";
import { getLinqRate } from "@/server/linq-offramp";

export async function GET() {
  try {
    const { rate } = await getLinqRate();
    return ok({ marketRate: rate, cacheTtlSeconds: 60 });
  } catch (error) {
    return handleApiError(error);
  }
}
