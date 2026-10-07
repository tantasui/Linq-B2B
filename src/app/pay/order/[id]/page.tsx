import { notFound } from "next/navigation";
import { PaymentCheckout } from "@/components/checkout/PaymentCheckout";
import { getOrder } from "@/server/store";

interface ResumePageProps {
  params: Promise<{ id: string }>;
}

/**
 * An order's own checkout, for the links in reminder and "complete your
 * payment" emails. The payer who closed the tab comes back to the order they
 * started — its address, what is still owed, or the button to complete it —
 * rather than to a payment link that would start a new one.
 */
export default async function ResumeOrderPage({ params }: ResumePageProps) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order?.paymentLinkId) notFound();

  return (
    <PaymentCheckout
      linkId={order.paymentLinkId}
      mode="fixed"
      initialAmount={order.amountNgn}
      currency="NGN"
      initialOrderId={order.id}
    />
  );
}
