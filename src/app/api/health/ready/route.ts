import { getReadiness } from "@/server/readiness";

export async function GET() {
  const readiness = await getReadiness();
  return Response.json(
    { ok: readiness.ready, data: readiness },
    { status: readiness.ready ? 200 : 503 },
  );
}
