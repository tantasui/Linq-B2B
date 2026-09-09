import { PaymentCheckout } from "@/components/checkout/PaymentCheckout";
import type { FiatCurrency, PaymentMode } from "@/lib/payment-data";

interface CheckoutPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ amount?: string; currency?: string; memo?: string; description?: string; mode?: string }>;
}

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { id } = await params;
  const { amount = "", currency = "NGN", memo, description, mode } = await searchParams;
  const paymentMode: PaymentMode = mode === "open" || !amount ? "open" : "fixed";
  const paymentCurrency: FiatCurrency = currency === "NGN" ? "NGN" : "USD";
  const parsedAmount = Number(amount);

  // No theme sync here any more: the product is ink in every context, so the
  // payer sees the same surface the merchant does regardless of their device.
  return (
    <>
      <PaymentCheckout
        linkId={id}
        mode={paymentMode}
        initialAmount={Number.isFinite(parsedAmount) ? parsedAmount : 0}
        currency={paymentCurrency}
        description={description ?? memo}
      />
    </>
  );
}
