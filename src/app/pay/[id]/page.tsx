import { DeviceThemeSync } from "@/components/checkout/DeviceThemeSync";
import { PaymentCheckout } from "@/components/checkout/PaymentCheckout";
import { deviceThemeBootScript } from "@/components/providers/ThemeProvider";
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

  return (
    <>
      {/* Overrides the root layout's boot script, which would otherwise apply
          whatever theme the merchant last set in their own dashboard. */}
      <script dangerouslySetInnerHTML={{ __html: deviceThemeBootScript }} />
      <DeviceThemeSync />
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
