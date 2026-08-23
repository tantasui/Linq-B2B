"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export const merchantLogoStorageKey = "linq-merchant-logo";
export const merchantLogoChangedEvent = "linq-merchant-logo-changed";

export function MerchantAvatar({ className, imageClassName }: { className?: string; imageClassName?: string }) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setLogo(window.localStorage.getItem(merchantLogoStorageKey));
    load();
    window.addEventListener("storage", load);
    window.addEventListener(merchantLogoChangedEvent, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(merchantLogoChangedEvent, load);
    };
  }, []);

  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2 text-text-subtle ring-1 ring-line", className)}>
      {logo ? (
        <img src={logo} alt="Merchant profile" loading="eager" decoding="async" className={cn("h-full w-full object-cover", imageClassName)} />
      ) : (
        <UserRound className="h-1/2 w-1/2" />
      )}
    </span>
  );
}
