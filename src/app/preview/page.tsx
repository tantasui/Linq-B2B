"use client";

import { useState } from "react";
import { ArrowRight, Wallet } from "lucide-react";
import { LinqLockup, LinqLoader, LinqMark, LinqWordmark } from "@/components/brand/LinqMark";
import { Receipt } from "@/components/brand/Receipt";
import { NairaTransferDetails } from "@/components/checkout/NairaTransferDetails";
import { SegmentedBar } from "@/components/brand/SegmentedBar";
import { SuccessCheck } from "@/components/brand/SuccessCheck";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy";
import { DateCarousel } from "@/components/ui/date-carousel";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Switch } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AddButton } from "@/components/ui/stepper";
import { StatusPill } from "@/components/ui/status";
import { TabBar } from "@/components/ui/tab-bar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { ENABLED_CHAINS } from "@/lib/chains";
import type { OrderRecord } from "@/server/types";

/**
 * The shared design spec, rendered as the live components rather than written
 * down separately — a spec that can drift from the build is worth very little.
 * iOS implements from this same page.
 */

const sampleOrder: OrderRecord = {
  id: "ord_8fd21c4a",
  businessId: "biz_1",
  payerName: "Adaeze Okonkwo",
  payerEmail: "adaeze@example.com",
  amountNgn: 485_000,
  token: "USDC",
  network: "base",
  quotedRate: 1612,
  cryptoAmountDue: 300.87,
  transactionFee: 0.45,
  paycrestOrderId: "0x7d3f9ac41b8e25f6a0c9",
  status: "settled",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-10 first:border-t-0">
      <div className="mb-6">
        <h2 className="text-sm font-medium tracking-[-0.01em]">{title}</h2>
        {hint ? <p className="mt-1 max-w-xl text-xs leading-5 text-text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div>
      <div className={`h-14 rounded-md ring-1 ring-line ${className}`} />
      <p className="mt-2 text-micro text-text-muted">{name}</p>
    </div>
  );
}

export default function PreviewPage() {
  const [network, setNetwork] = useState("base");
  const [tab, setTab] = useState("sui");
  const [date, setDate] = useState(new Date());
  const [armed, setArmed] = useState(false);
  const [notify, setNotify] = useState(true);
  const [amount, setAmount] = useState("");
  const { toast } = useToast();

  const tabs = ENABLED_CHAINS.slice(0, 3).map((chain) => ({
    id: chain.id,
    label: chain.shortName,
    adornment: <NetworkLogo network={chain.id} size={18} />,
  }));

  return (
    <main className="min-h-screen bg-bg px-6 py-14 text-text lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between gap-6 pb-10">
          <div>
            <LinqLockup size={26} className="text-accent" />
            <h1 className="mt-6 text-hero font-semibold">Design system</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-text-muted">
              One visual and interaction system across iOS and web. Every screen is built from
              these tokens and components, not reconciled after the fact.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <Row title="Colour" hint="A near-white base and a true dark charcoal, with one restrained accent reserved for primary actions and live state.">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            <Swatch name="bg" className="bg-bg" />
            <Swatch name="surface" className="bg-surface" />
            <Swatch name="surface-2" className="bg-surface-2" />
            <Swatch name="accent" className="bg-accent" />
            <Swatch name="accent-soft" className="bg-accent-soft" />
            <Swatch name="ticket" className="bg-ticket" />
          </div>
        </Row>

        <Row title="Type" hint="Tabular figures for every monetary amount, so numbers align down a list. Large confident balances, quiet metadata.">
          <div className="space-y-4">
            <p className="tnum text-display font-semibold">₦4,851,200</p>
            <p className="tnum text-hero font-semibold">₦485,000</p>
            <p className="text-base">Body — settlement completed to GTBank ••4471</p>
            <p className="text-sm text-text-muted">Metadata — 23 Aug 2026 at 14:32 · Base · USDC</p>
            <p className="text-micro uppercase tracking-[0.14em] text-text-subtle">Label</p>
          </div>
        </Row>

        <Row title="Brand marks" hint="Drawn from the source vectors and tinted through currentColor, so they are never recoloured off-system.">
          <div className="flex flex-wrap items-center gap-10">
            <LinqMark size={52} className="text-accent" />
            <LinqWordmark size={26} className="text-accent" />
            <LinqLockup size={20} className="text-accent" />
            <div className="rounded-md bg-accent p-4">
              <LinqLockup size={20} className="text-white" />
            </div>
          </div>
        </Row>

        <Row title="Loading" hint="The chain-link interlock is the app's one loader. The segmented bar carries progress — determinate for steps, a travelling wave when there is no percentage.">
          <div className="grid gap-8 sm:grid-cols-2">
            <Card className="flex items-center justify-center gap-10 py-10">
              <LinqLoader size={40} label="Processing" />
              <SuccessCheck />
            </Card>
            <Card className="space-y-6 py-8">
              <SegmentedBar value={3} segments={6} label="KYC — step 3 of 6" />
              <SegmentedBar label="Processing conversion" />
              <div className="space-y-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-44" />
              </div>
            </Card>
          </div>
        </Row>

        <Row title="Buttons" hint="Every tappable element presses to 0.97 and lifts on hover. Disabled drops opacity rather than changing colour — the same button, not ready.">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Convert to cash <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary">
              <Wallet className="h-4 w-4" /> Receive
            </Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Log out</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Creating order</Button>
            <Button onClick={() => toast("Payment received while you were away", "info")}>
              Toast
            </Button>
          </div>
        </Row>

        <Row title="Select" hint="One dropdown pattern for currency, network and payout method — the chevron flips and the panel scales in.">
          <div className="grid gap-6 sm:grid-cols-2">
            <Select
              label="Network"
              value={network}
              onChange={setNetwork}
              options={ENABLED_CHAINS.map((chain) => ({
                value: chain.id,
                label: chain.name,
                hint: chain.tokens.join(" · "),
                adornment: <NetworkLogo network={chain.id} size={22} />,
              }))}
            />
            <Field label="Amount" hint="Payer enters the amount at checkout.">
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="tnum"
              />
            </Field>
          </div>
        </Row>

        <Row title="Tabs, stepper, switch" hint="Tabs switch between a merchant's wallets. The stepper adds a wallet, a teammate or a payout destination.">
          <div className="flex flex-wrap items-center gap-10">
            <TabBar tabs={tabs} activeId={tab} onSelect={setTab} onAdd={() => toast("Add wallet")} />
            <AddButton label="Add wallet" stacked active={armed} onClick={() => setArmed((v) => !v)} />
            <Switch checked={notify} onChange={setNotify} label="Payment notifications" />
            <div className="flex gap-2">
              <StatusPill status="settled" />
              <StatusPill status="pending" />
              <StatusPill status="failed" />
            </div>
          </div>
        </Row>

        <Row title="Date carousel" hint="The history scrubber: the selection animates into the centre and grows, while the previous one shrinks to the side style.">
          <Card className="px-0">
            <DateCarousel value={date} onChange={setDate} />
          </Card>
        </Row>

        <Row title="Receipt" hint="The transaction receipt is the brand's ticket — printer slot, dashed perforation, scalloped edge. One component, both modes.">
          <Receipt order={sampleOrder} merchant={{ businessName: "Mama Tolu Foods" }} printing />
        </Row>

        <Row
          title="Pay with Naira"
          hint="A Nigerian payer confirms a transfer by checking the name their bank resolves. All three fields sit together, name first — never behind a details toggle."
        >
          <div className="grid items-start gap-8 sm:grid-cols-2">
            <NairaTransferDetails
              merchant={{
                businessName: "Mama Tolu Foods",
                bankAccounts: [
                  {
                    id: "bank_1",
                    businessId: "biz_1",
                    institutionCode: "058",
                    institutionName: "Guaranty Trust Bank",
                    accountIdentifier: "0123456789",
                    resolvedAccountName: "MAMA TOLU FOODS LTD",
                    verificationStatus: "verified",
                  },
                ],
              }}
            />
            <NairaTransferDetails
              merchant={{ businessName: "Mama Tolu Foods", bankAccounts: [] }}
            />
          </div>
        </Row>

        <Row title="Address & empty state">
          <div className="grid items-start gap-8 sm:grid-cols-2">
            <CopyField value="0x7d3f9ac41b8e25f6a0c93d1f8e4b27a0c93d1f8e" label="Address" />
            <EmptyState
              title="No transactions yet"
              body="Your first settled payment will appear here."
              action={<Button size="sm">Create a receive link</Button>}
            />
          </div>
        </Row>
      </div>
    </main>
  );
}
