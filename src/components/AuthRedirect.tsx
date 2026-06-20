"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMerchantMe, hasActiveSessionHint } from "@/lib/api-client";

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
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-black/[0.08] bg-white px-5 py-4 shadow-[0_20px_60px_rgba(50,23,104,.18)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">You&apos;re signed in. Where would you like to go?</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShow(false)}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            Stay on website
          </button>
          <Link
            href={to}
            className="rounded-full bg-[#8A4FFF] px-4 py-2 text-sm font-medium text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
