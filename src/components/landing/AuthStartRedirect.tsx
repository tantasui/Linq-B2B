"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";

export function AuthStartRedirect() {
  const router = useRouter();
  const dynamic = useDynamicBridge();

  useEffect(() => {
    if (!dynamic.enabled || !dynamic.connected) return;

    router.replace("/dashboard");
  }, [dynamic.connected, dynamic.enabled, router]);

  return null;
}
