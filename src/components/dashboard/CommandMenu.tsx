"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  href: string;
}

/**
 * Keyboard-first jump list for the dashboard: type to filter, arrows to move,
 * Enter to go. Anything typed can also be searched for in Orders.
 *
 * Mounted only while open, so each opening starts with an empty query.
 */
export function CommandMenu({ items, onClose }: { items: CommandItem[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = items.filter((item) => item.label.toLowerCase().includes(q));
    if (!q) return matched;
    return [
      ...matched,
      {
        id: "search-orders",
        label: `Search orders for “${query.trim()}”`,
        group: "Search",
        icon: Search,
        href: `/dashboard/transactions?q=${encodeURIComponent(query.trim())}`,
      },
    ];
  }, [items, query]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => input.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [onClose]);

  const choose = (item?: CommandItem) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="linq-scrim linq-fade-in absolute inset-0 bg-text/30 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="linq-pop-in relative w-full max-w-[520px] overflow-hidden rounded-xl bg-surface shadow-xl ring-1 ring-line"
      >
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="h-4 w-4 shrink-0 text-text-subtle" />
          <input
            ref={input}
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls="linq-command-list"
            aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
            aria-label="Search pages and actions"
            placeholder="Go to a page, create a link, find a payer"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                choose(results[active]);
              }
            }}
            className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-text outline-none placeholder:text-text-subtle"
          />
          <kbd className="rounded-xs bg-surface-2 px-1.5 py-0.5 font-sans text-micro text-text-subtle ring-1 ring-line">Esc</kbd>
        </div>
        <ul id="linq-command-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((item, index) => {
            const showGroup = index === 0 || results[index - 1].group !== item.group;
            const selected = index === active;
            return (
              <li key={item.id} role="presentation">
                {showGroup ? <p className="px-3 pb-1 pt-2 text-micro text-text-subtle">{item.group}</p> : null}
                <button
                  id={`cmd-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-fast ease-linq",
                    selected ? "bg-accent-soft text-accent-text" : "text-text-muted",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {selected ? <CornerDownLeft className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
