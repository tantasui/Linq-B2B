"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ChartFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("min-w-0", className)}>
      {mounted ? children : <div className="linq-skeleton h-full w-full rounded-md" />}
    </div>
  );
}
