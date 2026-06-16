"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMerchantMe, hasActiveSessionHint } from "@/lib/api-client";

export function AuthRedirect({ to = "/dashboard" }: { to?: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    if (!hasActiveSessionHint()) return;

    getMerchantMe()
      .then(({ merchant }) => {
        if (!cancelled && merchant?.id) router.replace(to);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [router, to]);

  return null;
}
