"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMerchantMe, hasActiveSessionHint } from "@/lib/api-client";
import { Button, buttonClasses } from "@/components/ui/button";

export function AuthRedirect({ to = "/dashboard" }: { to?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!hasActiveSessionHint()) return;

    getMerchantMe()
      .then(({ merchant }) => {
        if (!cancelled && merchant?.id) setShow(true);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="linq-sheet-up fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-surface px-5 py-4 shadow-lg ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">You&apos;re signed in. Where would you like to go?</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShow(false)}>
            Stay here
          </Button>
          <Link href={to} className={buttonClasses({ size: "sm", className: "rounded-full" })}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
