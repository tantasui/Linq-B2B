import { chainSupportsToken, getChain } from "@/lib/chains";
import { fail, handleApiError, ok } from "@/server/http";
import { createLinqOrder } from "@/server/linq-offramp";
import { createStellarOrder } from "@/server/linq-stellar";
import { DEPOSIT_WINDOW_MS, expireOrderIfDue } from "@/server/order-expiry";
import { getRequestMerchant } from "@/server/request-merchant";
import { getClientKey, rateLimit } from "@/server/security";
import { addOrderEvent, createOrder, getMerchant, getPaymentLink, listOrders, updateOrder } from "@/server/store";
import { orderCreateSchema } from "@/server/validation";

export async function GET(request: Request) {
  try {
    const merchant = await getRequestMerchant(request);
    if (!merchant) return ok({ orders: [] });
    const orders = await listOrders(merchant.id);
    // Surface expired orders correctly in the merchant list.
    const settled = await Promise.all(orders.map((entry) => expireOrderIfDue(entry)));
    return ok({ orders: settled });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const limit = rateLimit(`order:${getClientKey(request)}`, 30);
    if (!limit.allowed) return fail("Too many order attempts.", 429);
    const input = orderCreateSchema.parse(await request.json());
    const link = await getPaymentLink(input.paymentLinkId);
    if (!link) return fail("Payment link not found.", 404);
    if (link.mode === "static") return fail("Static wallet links do not create offramp orders.", 400);
    const amountNgn = link.mode === "fixed" ? link.amountNgn : input.amountNgn;
    if (!amountNgn) return fail("Amount is required for this payment link.", 422);
    const merchant = await getMerchant(link.businessId);
    if (!merchant) return fail("Merchant for this payment link was not found.", 404);
    const bank = merchant.bankAccounts.find((entry) => entry.verificationStatus === "verified");
    if (!bank) return fail("Merchant payout bank is not verified.", 409);

    const token = input.token ?? "USDSUI";
    const network = input.network ?? "sui";
    const chain = getChain(network);
    if (!chain || !chain.enabled) return fail(`Unsupported network: ${network}.`, 422);
    if (!chainSupportsToken(network, token)) {
      return fail(`${token} is not supported on ${chain.name}.`, 422);
    }

    const idempotencyKey = `lnq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    let order = await createOrder({
      businessId: merchant.id,
      paymentLinkId: link.id,
      bankAccountId: bank.id,
      payerName: input.payerName,
      payerEmail: input.payerEmail,
      amountNgn,
      token,
      network: chain.id,
      quotedRate: 0,
      cryptoAmountDue: 0,
      status: "initiated",
    });
    await addOrderEvent(order.id, "app", "order.initiated", { idempotencyKey, paymentLinkId: link.id, token, network: chain.id, amountNgn });
    try {
      // Stellar is settled by its own standalone service, which owns its
      // deposit accounts and confirms on-chain itself; every other chain goes
      // through Linq's native /b2b/offramp, as before.
      const result =
        chain.id === "stellar"
          ? await createStellarOrder({ idempotencyKey, amountNgn, bank, payerName: input.payerName })
          : await createLinqOrder({ idempotencyKey, amountNgn, token, network: chain.id, bank, payerName: input.payerName });
      order = await updateOrder(order.id, {
        quotedRate: result.quotedRate,
        cryptoAmountDue: result.cryptoAmountDue,
        paycrestOrderId: result.linqOrderId,
        providerReceiveAddress: result.providerReceiveAddress,
        // Each provider watches its own deposit wallet for its own window —
        // linq-stellar reports its real deadline; Linq's native flow doesn't,
        // so 10 minutes (its own window) is assumed for it.
        validUntil:
          "depositDeadline" in result
            ? result.depositDeadline
            : new Date(Date.now() + DEPOSIT_WINDOW_MS).toISOString(),
        status: result.status,
        paycrestPayload: result.raw,
      }) ?? order;
      await addOrderEvent(order.id, "app", `order.created.${result.status}`, result.raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order creation failed.";
      await updateOrder(order.id, { status: "failed", paycrestPayload: { error: message } });
      await addOrderEvent(order.id, "app", "order.create_failed", { message });
      throw error;
    }
    return ok({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
