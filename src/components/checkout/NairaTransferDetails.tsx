"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Landmark, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/ui/copy";
import { verifyBank } from "@/lib/api-client";
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
 *
 * When the name was never stored, it is resolved live rather than left blank.
 * An unverified account still renders its details, but is labelled as such: the
 * payer is told what has and has not been confirmed instead of being shown an
 * unchecked account that looks identical to a checked one.
 */
export function NairaTransferDetails({
  merchant,
}: {
  merchant: Pick<MerchantRecord, "businessName" | "bankAccounts">;
}) {
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);

  // Prefer a verified account; fall back to the first configured one so the
  // payer still sees transfer details rather than a dead end.
  const account =
    merchant.bankAccounts.find((entry) => entry.verificationStatus === "verified") ??
    merchant.bankAccounts[0];
  const verified = account?.verificationStatus === "verified";
  const logo = getBankLogo(account?.institutionCode, account?.institutionName);

  const institutionCode = account?.institutionCode;
  const accountIdentifier = account?.accountIdentifier;
  const storedName = account?.resolvedAccountName;

  useEffect(() => {
    if (!institutionCode || !accountIdentifier || storedName) return;
    let cancelled = false;
    setResolving(true);
    verifyBank(institutionCode, accountIdentifier)
      .then((result) => {
        if (!cancelled && result.accountName) setResolvedName(result.accountName);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [institutionCode, accountIdentifier, storedName]);

  if (!account) {
    return (
      <div className="rounded-lg bg-warning-soft p-4 text-sm text-text">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          Naira transfer unavailable
        </p>
        <p className="mt-2 text-xs leading-5 text-text-muted">
          {merchant.businessName} has not added a Naira payout account yet. Pay with crypto
          instead, or ask them to finish setting one up.
        </p>
      </div>
    );
  }

  const accountName = storedName || resolvedName;

  const rows = [
    {
      label: "Account name",
      value: accountName || (resolving ? "Resolving…" : undefined),
      emphasis: true,
      pending: !accountName,
      copyAs: accountName ? "Account name" : undefined,
    },
    {
      label: "Account number",
      value: account.accountIdentifier,
      mono: true,
      copyAs: "Account number",
    },
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
                row.pending && !resolving && "text-danger",
                row.pending && resolving && "text-text-muted",
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

      {accountName && verified ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          {/* One text node, or the fragments become separate flex columns. */}
          <span>
            Your bank should show{" "}
            <span className="font-medium text-text">{accountName}</span> when you enter this
            account number. If it shows a different name, stop and do not send.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2.5 text-xs leading-5 text-text">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            {accountName
              ? "This payout account has not completed verification yet. Check the name your bank shows matches before you send."
              : resolving
                ? "Resolving the account name with the bank…"
                : "This account name could not be resolved. Check the name your bank shows before sending."}
          </span>
        </p>
      )}
    </div>
  );
}
