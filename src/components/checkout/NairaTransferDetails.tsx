"use client";

import { AlertTriangle, Landmark, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/ui/copy";
import { getBankLogo } from "@/lib/banks";
import type { MerchantRecord } from "@/server/types";
import { cn } from "@/lib/utils";

/**
 * How a Nigerian payer verifies a transfer before sending it: the bank resolves
 * the account number and shows the registered name, and the payer checks that
 * name against who they think they are paying.
 *
 * Showing the number and bank without the name removes that check, and its
 * absence reads as a fraud signal — so all three sit together here, with the
 * name given the most weight, never behind a details toggle.
 */
export function NairaTransferDetails({
  merchant,
}: {
  merchant: Pick<MerchantRecord, "businessName" | "bankAccounts">;
}) {
  const account = merchant.bankAccounts.find((entry) => entry.verificationStatus === "verified");
  const logo = getBankLogo(account?.institutionCode, account?.institutionName);

  if (!account) {
    return (
      <div className="rounded-lg bg-warning-soft p-4 text-sm text-text">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          Naira transfer unavailable
        </p>
        <p className="mt-2 text-xs leading-5 text-text-muted">
          {merchant.businessName} has not verified a Naira payout account yet. Pay with crypto
          instead, or ask them to complete verification.
        </p>
      </div>
    );
  }

  const rows = [
    { label: "Account name", value: account.resolvedAccountName, emphasis: true, copyAs: "Account name" },
    { label: "Account number", value: account.accountIdentifier, mono: true, copyAs: "Account number" },
    { label: "Bank", value: account.institutionName ?? account.institutionCode },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {logo ? (
          <img
            src={logo}
            alt=""
            loading="eager"
            decoding="async"
            className="h-11 w-11 rounded-md bg-white object-contain ring-1 ring-line"
          />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-accent-text">
            <Landmark className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">Bank transfer</p>
          <p className="text-xs text-text-muted">Send the exact amount to this account</p>
        </div>
      </div>

      <dl className="divide-y divide-line rounded-lg bg-surface-2 px-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 py-3">
            <dt className="w-28 shrink-0 text-xs text-text-muted">{row.label}</dt>
            <dd
              className={cn(
                "min-w-0 flex-1 truncate",
                row.mono && "tnum font-mono",
                row.emphasis ? "text-sm font-semibold" : "text-sm",
                !row.value && "text-danger",
              )}
            >
              {row.value ?? "Not resolved"}
            </dd>
            {row.copyAs && row.value ? (
              <CopyButton value={row.value} label={row.copyAs} size={14} className="-mr-2 p-1.5" />
            ) : null}
          </div>
        ))}
      </dl>

      {account.resolvedAccountName ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          {/* One text node, or the fragments become separate flex columns. */}
          <span>
            Your bank should show{" "}
            <span className="font-medium text-text">{account.resolvedAccountName}</span> when you
            enter this account number. If it shows a different name, stop and do not send.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2.5 text-xs leading-5 text-text">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            This account name has not been resolved yet. Check the name your bank shows before
            sending.
          </span>
        </p>
      )}
    </div>
  );
}
