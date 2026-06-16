"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("Sheet components must be used inside Sheet");
  return context;
}

export function Sheet({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ children }: { children: React.ReactNode }) {
  const { onOpenChange } = useSheet();
  return <button onClick={() => onOpenChange(true)}>{children}</button>;
}

export function SheetContent({
  side = "right",
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { side?: "left" | "right" }) {
  const { open, onOpenChange } = useSheet();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button className="absolute inset-0 bg-black/60" aria-label="Close navigation" onClick={() => onOpenChange(false)} />
      <div
        className={cn(
          "absolute inset-y-0 w-3/4 border bg-background shadow-2xl",
          side === "left" ? "left-0" : "right-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
