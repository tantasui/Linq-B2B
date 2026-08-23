"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  // Safari on non-secure origins and older in-app browsers have no async
  // clipboard; a payer copying a deposit address cannot be left without one.
  const field = document.createElement("textarea");
  field.value = value;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}

/**
 * Copy feedback is inline and brief: the icon morphs to a checkmark for ~1.5s
 * and a toast confirms what was copied. Copying an address should never open a
 * modal — it interrupts the one thing the user is in the middle of doing.
 */
export function useCopy() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (value: string, label = "Copied") => {
      try {
        await writeToClipboard(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
        toast(`${label} copied`, "success");
      } catch {
        toast("Copy failed — select and copy manually", "error");
      }
    },
    [toast],
  );

  return { copy, copied };
}

export function CopyButton({
  value,
  label = "Copied",
  className,
  size = 16,
}: {
  value: string;
  label?: string;
  className?: string;
  size?: number;
}) {
  const { copy, copied } = useCopy();

  return (
    <button
      type="button"
      aria-label={`Copy ${label.toLowerCase()}`}
      onClick={() => copy(value, label)}
      className={cn(
        "grid shrink-0 place-items-center rounded-sm p-2 text-text-muted",
        "transition duration-fast ease-linq hover:bg-surface-2 hover:text-text active:scale-[0.97]",
        className,
      )}
    >
      {copied ? (
        <Check className="text-success linq-fade-in" style={{ width: size, height: size }} />
      ) : (
        <Copy style={{ width: size, height: size }} />
      )}
    </button>
  );
}

/** A monospaced value (address, hash, account number) with copy affordance. */
export function CopyField({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md bg-surface-2 py-1 pl-3.5 pr-1", className)}>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">{value}</code>
      <CopyButton value={value} label={label ?? "Value"} />
    </div>
  );
}
