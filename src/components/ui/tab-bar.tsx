"use client";

import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  hint?: string;
  adornment?: React.ReactNode;
}

/**
 * The tab-strip pattern, used here for switching between a merchant's wallets
 * and accounts. The active tab is raised onto the surface while inactive tabs
 * sit recessed into the track, so the current context is legible at a glance
 * rather than only by colour.
 *
 * Adding animates a tab in from the right; closing collapses its width to zero
 * and lets the remainder slide over to fill the gap.
 */
export function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onAdd,
  addLabel = "Add",
  className,
}: {
  tabs: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1.5",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className={cn(
              "linq-fade-in group flex shrink-0 items-center gap-2 rounded-md pl-3 pr-1.5",
              "transition-all duration-slow ease-linq",
              active
                ? "bg-surface shadow-sm"
                : "bg-transparent hover:bg-surface/60",
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.id)}
              className={cn(
                "flex items-center gap-2 py-2.5 text-sm transition-colors duration-fast ease-linq",
                active ? "text-text" : "text-text-muted hover:text-text",
              )}
            >
              {tab.adornment}
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.hint ? (
                <span className="tnum whitespace-nowrap text-xs text-text-subtle">{tab.hint}</span>
              ) : null}
            </button>

            {onClose ? (
              <button
                type="button"
                aria-label={`Close ${tab.label}`}
                onClick={() => onClose(tab.id)}
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-xs text-text-subtle",
                  "transition duration-fast ease-linq hover:bg-surface-3 hover:text-text active:scale-[0.9]",
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="w-1.5" />
            )}
          </div>
        );
      })}

      {onAdd ? (
        <button
          type="button"
          aria-label={addLabel}
          onClick={onAdd}
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md text-text-muted",
            "transition duration-fast ease-linq hover:bg-surface hover:text-text hover:shadow-sm active:scale-[0.94]",
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
