import { fail, handleApiError, ok } from "@/server/http";
import { notifyWalletIncoming } from "@/server/receipts";
import { verifyDynamicSignature } from "@/server/security";
import { addOrderEvent } from "@/server/store";
import { dynamicWalletIncomingSchema } from "@/server/validation";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature =
      request.headers.get("x-dynamic-signature-256") ??
      request.headers.get("x-dynamic-signature") ??
      request.headers.get("dynamic-signature") ??
      request.headers.get("x-signature");
    if (!verifyDynamicSignature(raw, signature)) return fail("Invalid Dynamic webhook signature.", 401);
    const payload = JSON.parse(raw);
    const data = payload.data ?? payload;
    const walletAddress = data.walletAddress ?? data.address ?? data.to;
    const amountToken = data.amountToken ?? data.amount ?? data.value;
    const businessId = data.businessId ?? data.metadata?.businessId;

    if (!walletAddress || !amountToken || !businessId) {
      await addOrderEvent(undefined, "app", payload.event ?? payload.type ?? "dynamic.event", payload);
      return ok({ received: true, ignored: "No wallet transfer payload to reconcile." });
    }

    const parsed = dynamicWalletIncomingSchema.parse({
      businessId,
      walletAddress,
      network: data.network ?? data.chain ?? "base",
      token: data.token ?? data.asset ?? "USDSUI",
      amountToken,
      reason: data.reason ?? data.metadata?.reason ?? "merchant_direct_receive",
      transactionHash: data.transactionHash ?? data.hash,
      rawPayload: payload,
    });
    await addOrderEvent(undefined, "app", `dynamic.wallet.${parsed.reason}`, payload);
    const incoming = await notifyWalletIncoming(parsed);
    return ok({ received: true, incoming });
  } catch (error) {
    return handleApiError(error);
  }
}
