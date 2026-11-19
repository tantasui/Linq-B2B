"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The dashboard's table: sortable headers (aria-sort), row selection with a
 * part-checked header box, a sticky header that gains a shadow once the body
 * scrolls, numbered pages, a bulk-action bar that rises when rows are picked,
 * skeleton rows while loading, and columns that drop away when the table's own
 * box is narrow — measured on the table, not the window, so it also behaves
 * inside a half-width panel.
 *
 * Rows can open: pass `onRowOpen` and the whole row is clickable, with a real
 * button in the first cell for keyboard users.
 *
 * Keyboard: Tab through sort buttons, checkboxes and row buttons; Space ticks;
 * Escape clears the selection. Sort and selection changes are announced.
 */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  width?: number | string;
  /** Presence makes the column sortable. */
  sortValue?: (row: T) => string | number;
  /** `narrow` is true when narrowHide columns are gone, so a cell can carry their facts. */
  render: (row: T, context: { narrow: boolean }) => ReactNode;
  /** Dropped when the table is narrower than `narrowAt`. */
  narrowHide?: boolean;
  /** Numeric columns sort high-to-low first and use tabular figures. */
  numeric?: boolean;
}

type Dir = "asc" | "desc";

/** Watches the table's own width, so hidden columns are not rendered at all and colSpans stay right. */
function useNarrow(max: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setNarrow(el.clientWidth <= max);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [max]);
  return [ref, narrow] as const;
}

const checkbox =
  "linq-check relative h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[5px] bg-surface shadow-[inset_0_0_0_1.5px_hsl(var(--border-strong))] transition-[background-color,box-shadow,transform] duration-fast ease-linq " +
  "checked:bg-accent checked:shadow-none indeterminate:bg-accent indeterminate:shadow-none active:scale-90 disabled:cursor-default disabled:opacity-40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export function DataTable<T>({
  data,
  columns,
  getRowId,
  caption,
  pageSize = 15,
  loading = false,
  selectable = true,
  bulkActions,
  empty,
  initialSort,
  noun = ["row", "rows"],
  narrowAt = 640,
  maxHeight,
  onRowOpen,
  rowLabel,
  isRowOpen,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Accessible name for the table. */
  caption: string;
  pageSize?: number;
  loading?: boolean;
  selectable?: boolean;
  bulkActions?: (selection: { ids: string[]; rows: T[]; clear: () => void }) => ReactNode;
  empty?: ReactNode;
  initialSort?: { key: string; dir: Dir };
  noun?: [string, string];
  narrowAt?: number;
  maxHeight?: number;
  onRowOpen?: (row: T) => void;
  /** What the row's open button announces, e.g. "Open payment from Chidi". */
  rowLabel?: (row: T) => string;
  isRowOpen?: (row: T) => boolean;
}) {
  const uid = useId();
  const [sort, setSort] = useState<{ key: string; dir: Dir } | null>(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [scrolled, setScrolled] = useState(false);
  const [live, setLive] = useState("");
  const headBox = useRef<HTMLInputElement>(null);
  const bulkBar = useRef<HTMLDivElement>(null);
  const [cardRef, narrow] = useNarrow(narrowAt);
  const cols = narrow ? columns.filter((column) => !column.narrowHide) : columns;

  const sorted = useMemo(() => {
    const column = sort ? columns.find((entry) => entry.key === sort.key) : undefined;
    if (!sort || !column?.sortValue) return data;
    const value = column.sortValue;
    const direction = sort.dir === "asc" ? 1 : -1;
    // Stable: equal values keep the order the data arrived in.
    return data
      .map((row, index) => [row, index] as const)
      .sort((a, b) => {
        const x = value(a[0]);
        const y = value(b[0]);
        const order =
          typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
        return order * direction || a[1] - b[1];
      })
      .map(([row]) => row);
  }, [data, columns, sort]);

  // A filter from outside shrinking the data sends the reader back to page one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: data identity is the trigger
  useEffect(() => setPage(0), [data]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize);
  const ids = rows.map(getRowId);
  const pickedOnPage = ids.filter((id) => picked.has(id)).length;
  const allOnPage = ids.length > 0 && pickedOnPage === ids.length;
  const someOnPage = pickedOnPage > 0 && !allOnPage;

  useLayoutEffect(() => {
    if (headBox.current) headBox.current.indeterminate = someOnPage;
  }, [someOnPage]);

  const total = picked.size;

  // A hidden bar must not be reachable by Tab. React 18's types lack `inert`,
  // so it is set on the element directly.
  useEffect(() => {
    if (bulkBar.current) bulkBar.current.inert = total === 0;
  }, [total]);

  const say = (count: number) => `${count} ${count === 1 ? noun[0] : noun[1]} selected`;

  const cycleSort = (column: DataTableColumn<T>) => {
    const first: Dir = column.numeric ? "desc" : "asc";
    let next: { key: string; dir: Dir } | null;
    if (!sort || sort.key !== column.key) next = { key: column.key, dir: first };
    else if (sort.dir === first) next = { key: column.key, dir: first === "asc" ? "desc" : "asc" };
    else next = initialSort ?? null;
    setSort(next);
    setPage(0);
    setLive(next ? `Sorted by ${columns.find((c) => c.key === next.key)?.header}, ${next.dir === "asc" ? "ascending" : "descending"}` : "Sorting cleared");
  };

  const toggleRow = (id: string) =>
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setLive(say(next.size));
      return next;
    });

  const togglePage = () =>
    setPicked((previous) => {
      const next = new Set(previous);
      for (const id of ids) {
        if (allOnPage) next.delete(id);
        else next.add(id);
      }
      setLive(say(next.size));
      return next;
    });

  const clear = () => {
    setPicked(new Set());
    setLive("Selection cleared");
  };

  const selectAll = () => {
    setPicked(new Set(sorted.map(getRowId)));
    setLive(`All ${sorted.length} ${noun[1]} selected`);
  };

  const columnCount = cols.length + (selectable ? 1 : 0);
  const from = sorted.length ? current * pageSize + 1 : 0;
  const to = Math.min(sorted.length, current * pageSize + pageSize);

  /** First, last, and the pages either side of the current one; gaps become an ellipsis. */
  const pageButtons = useMemo(() => {
    const out: (number | "gap")[] = [];
    for (let index = 0; index < pages; index++) {
      if (index === 0 || index === pages - 1 || Math.abs(index - current) <= 1) out.push(index);
      else if (out[out.length - 1] !== "gap") out.push("gap");
    }
    return out;
  }, [pages, current]);

  const selectedRows = sorted.filter((row) => picked.has(getRowId(row)));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape-to-clear for the whole table
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && total > 0) clear();
      }}
    >
      <div ref={cardRef} className="relative overflow-hidden rounded-lg bg-surface shadow-sm ring-1 ring-line">
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard */}
        <div
          className="overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          style={maxHeight ? { maxHeight } : undefined}
          onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 2)}
          tabIndex={0}
          role="region"
          aria-label={`${caption}, scrollable`}
        >
          <table className={cn("w-full table-fixed border-separate border-spacing-0 text-sm", !narrow && "min-w-[640px]")} aria-busy={loading}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {selectable ? (
                  <th
                    scope="col"
                    className={cn(
                      "sticky top-0 z-10 h-11 w-12 bg-surface-2 p-0 shadow-[inset_0_-1px_0_hsl(var(--border))] transition-shadow",
                      scrolled && "shadow-[inset_0_-1px_0_hsl(var(--border)),0_8px_12px_-8px_hsl(var(--text)/0.14)]",
                    )}
                  >
                    <label className="flex h-11 w-12 cursor-pointer items-center justify-center">
                      <input
                        ref={headBox}
                        type="checkbox"
                        className={checkbox}
                        checked={allOnPage}
                        onChange={togglePage}
                        disabled={loading || !rows.length}
                        aria-label={`Select all ${noun[1]} on this page`}
                      />
                    </label>
                  </th>
                ) : null}
                {cols.map((column) => {
                  const active = sort?.key === column.key;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={column.sortValue ? (active ? (sort?.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                      className={cn(
                        "sticky top-0 z-10 h-11 whitespace-nowrap bg-surface-2 px-4 text-xs font-medium text-text-muted shadow-[inset_0_-1px_0_hsl(var(--border))] transition-shadow",
                        scrolled && "shadow-[inset_0_-1px_0_hsl(var(--border)),0_8px_12px_-8px_hsl(var(--text)/0.14)]",
                        column.align === "right" ? "text-right" : "text-left",
                        narrow && "px-3",
                      )}
                    >
                      {column.sortValue ? (
                        <button
                          type="button"
                          onClick={() => cycleSort(column)}
                          disabled={loading}
                          className={cn(
                            "group -mx-2 inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-medium transition-colors duration-fast ease-linq",
                            "hover:bg-surface-3/60 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60",
                            column.align === "right" && "flex-row-reverse",
                            active && "text-text",
                          )}
                        >
                          <span>{column.header}</span>
                          <ArrowDown
                            aria-hidden
                            className={cn(
                              "h-3 w-3 transition-[opacity,transform] duration-slow ease-linq",
                              active ? "opacity-100" : "translate-y-0.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-50 group-focus-visible:opacity-50",
                              active && sort?.dir === "asc" && "rotate-180",
                            )}
                          />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {loading
                ? Array.from({ length: Math.min(pageSize, 6) }, (_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity
                    <tr key={index} aria-hidden="true">
                      {selectable ? (
                        <td className="h-14 border-b border-line p-0">
                          <span className="linq-skeleton mx-auto block h-4 w-4 rounded-[5px]" />
                        </td>
                      ) : null}
                      {cols.map((column, columnIndex) => (
                        <td key={column.key} className={cn("h-14 border-b border-line px-4", narrow && "px-3")}>
                          <span
                            className={cn("linq-skeleton block h-3 rounded-sm", column.align === "right" && "ml-auto")}
                            style={{ width: `${[62, 44, 52, 40, 48, 56][(index + columnIndex) % 6]}%` }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row, rowIndex) => {
                    const id = getRowId(row);
                    const on = picked.has(id);
                    const open = isRowOpen?.(row) ?? false;
                    return (
                      <tr
                        key={id}
                        aria-selected={selectable ? on : undefined}
                        data-selected={on || undefined}
                        onClick={onRowOpen ? () => onRowOpen(row) : undefined}
                        className={cn(
                          "group/row transition-colors duration-fast ease-linq [&>td]:border-b [&>td]:border-line [&:last-child>td]:border-b-transparent",
                          onRowOpen && "cursor-pointer",
                          on ? "[&>td]:bg-accent-soft/70" : open ? "[&>td]:bg-surface-2" : "[@media(hover:hover)]:hover:[&>td]:bg-surface-2/70",
                        )}
                      >
                        {selectable ? (
                          <td
                            className={cn("h-14 p-0", on && "shadow-[inset_2px_0_0_hsl(var(--accent))]")}
                            // Ticking a row must not also open it.
                            onClick={(event) => event.stopPropagation()}
                          >
                            <label className="flex h-14 w-12 cursor-pointer items-center justify-center">
                              <input
                                type="checkbox"
                                className={checkbox}
                                checked={on}
                                onChange={() => toggleRow(id)}
                                aria-label={rowLabel ? `Select: ${rowLabel(row)}` : `Select row ${current * pageSize + rowIndex + 1}`}
                              />
                            </label>
                          </td>
                        ) : null}
                        {cols.map((column, columnIndex) => (
                          <td
                            key={column.key}
                            className={cn(
                              "h-14 overflow-hidden text-ellipsis whitespace-nowrap px-4 align-middle",
                              narrow && "px-3",
                              column.align === "right" && "text-right",
                              column.numeric && "tnum",
                            )}
                          >
                            {columnIndex === 0 && onRowOpen ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onRowOpen(row);
                                }}
                                aria-label={rowLabel?.(row)}
                                className="block w-full min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                {column.render(row, { narrow })}
                              </button>
                            ) : (
                              column.render(row, { narrow })
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={columnCount} className="p-0">
                    {empty ?? <p className="px-6 py-16 text-center text-sm text-text-muted">Nothing to show.</p>}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="tnum flex min-h-14 items-center justify-between gap-4 border-t border-line px-4 py-2 text-[0.8125rem] text-text-muted">
          <span>
            {loading ? (
              "Loading…"
            ) : sorted.length ? (
              <>
                <span className="font-medium text-text">
                  {from}–{to}
                </span>{" "}
                of <span className="font-medium text-text">{sorted.length}</span>
              </>
            ) : (
              `0 ${noun[1]}`
            )}
          </span>
          {pages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <PageButton label="Previous page" onClick={() => setPage(current - 1)} disabled={loading || current === 0}>
                <ChevronLeft className="h-4 w-4" />
              </PageButton>
              {narrow ? (
                <span className="mx-2">
                  Page {current + 1} of {pages}
                </span>
              ) : (
                pageButtons.map((entry, index) =>
                  entry === "gap" ? (
                    // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity beyond position
                    <span key={`gap-${index}`} aria-hidden className="grid w-5 place-items-center">
                      …
                    </span>
                  ) : (
                    <PageButton
                      key={entry}
                      label={`Page ${entry + 1}`}
                      current={entry === current}
                      onClick={() => setPage(entry)}
                      disabled={loading}
                    >
                      {entry + 1}
                    </PageButton>
                  ),
                )
              )}
              <PageButton label="Next page" onClick={() => setPage(current + 1)} disabled={loading || current >= pages - 1}>
                <ChevronRight className="h-4 w-4" />
              </PageButton>
            </nav>
          ) : null}
        </div>

        {/* The bulk bar rises over the footer while anything is ticked. */}
        <div
          ref={bulkBar}
          role="region"
          aria-label="Bulk actions"
          className={cn(
            "absolute bottom-[68px] left-1/2 z-20 flex h-12 max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-text pl-4 pr-2 text-[0.8125rem] font-medium text-bg shadow-xl sm:gap-3",
            "transition-[opacity,transform,visibility] duration-slow ease-linq motion-reduce:transition-opacity",
            total > 0 ? "visible translate-y-0 opacity-100" : "invisible translate-y-4 opacity-0",
          )}
        >
          <span className="tnum">
            <b className="font-semibold">{total}</b> selected
          </span>
          {allOnPage && total < sorted.length ? (
            <button type="button" onClick={selectAll} className="rounded-sm px-1 py-2 text-bg/70 underline underline-offset-4 hover:text-bg">
              Select all {sorted.length}
            </button>
          ) : null}
          <span aria-hidden className="h-5 w-px bg-bg/20" />
          {bulkActions?.({ ids: [...picked], rows: selectedRows, clear })}
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selection"
            className="grid h-8 w-8 place-items-center rounded-md text-bg/70 transition-colors hover:bg-bg/15 hover:text-bg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite" id={`${uid}-live`}>
        {live}
      </div>
    </div>
  );
}

function PageButton({
  children,
  label,
  current,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[0.8125rem] font-medium transition-[background-color,color,transform] duration-fast ease-linq active:scale-95 disabled:opacity-35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        current ? "cursor-default bg-text text-bg" : "hover:bg-surface-2 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

/** A button for the bulk bar: quiet on ink, label hidden on narrow screens. */
export function BulkAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-bg/15 px-3 transition-[background-color,transform] duration-fast ease-linq hover:bg-bg/25 active:scale-95"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
