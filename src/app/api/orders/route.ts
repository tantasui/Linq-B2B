import { fail, handleApiError, ok } from "@/server/http";
import { createLinqOrder } from "@/server/linq-offramp";
import { getRequestMerchant } from "@/server/request-merchant";
import { getClientKey, rateLimit } from "@/server/security";
import { addOrderEvent, createOrder, getMerchant, getPaymentLink, listOrders, updateOrder } from "@/server/store";
import { orderCreateSchema } from "@/server/validation";

export async function GET(request: Request) {
  try {
    const merchant = await getRequestMerchant(request);
    if (!merchant) return ok({ orders: [] });
    const orders = await listOrders(merchant.id);
    return ok({ orders });
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

    const idempotencyKey = `lnq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const token = input.token ?? "USDSUI";
    let order = await createOrder({
      businessId: merchant.id,
      paymentLinkId: link.id,
      bankAccountId: bank.id,
      payerName: input.payerName,
      payerEmail: input.payerEmail,
      amountNgn,
      token,
      network: "sui",
      quotedRate: 0,
      cryptoAmountDue: 0,
      status: "initiated",
    });
    await addOrderEvent(order.id, "app", "order.initiated", { idempotencyKey, paymentLinkId: link.id, token, network: "sui", amountNgn });
    try {
      const linq = await createLinqOrder({
        idempotencyKey,
        amountNgn,
        token,
        bank,
        payerName: input.payerName,
      });
      order = await updateOrder(order.id, {
        quotedRate: linq.quotedRate,
        cryptoAmountDue: linq.cryptoAmountDue,
        paycrestOrderId: linq.linqOrderId,
        providerReceiveAddress: linq.providerReceiveAddress,
        status: linq.status,
        paycrestPayload: linq.raw,
      }) ?? order;
      await addOrderEvent(order.id, "app", `order.created.${linq.status}`, linq.raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Linq order creation failed.";
      await updateOrder(order.id, { status: "failed", paycrestPayload: { error: message } });
      await addOrderEvent(order.id, "app", "order.create_failed", { message });
      throw error;
    }
    return ok({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
