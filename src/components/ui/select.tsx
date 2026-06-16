"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  value: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectValue: (value: string) => void;
  registerLabel: (value: string, label: React.ReactNode) => void;
  selectedLabel?: React.ReactNode;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("Select components must be used inside Select");
  return context;
}

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Select({ children, value, defaultValue = "", onValueChange }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [labels, setLabels] = React.useState<Record<string, React.ReactNode>>({});
  const currentValue = value ?? internalValue;
  const selectValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setOpen(false);
  };
  const registerLabel = React.useCallback((itemValue: string, label: React.ReactNode) => {
    setLabels((existing) => (existing[itemValue] === label ? existing : { ...existing, [itemValue]: label }));
  }, []);

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        open,
        setOpen,
        selectValue,
        registerLabel,
        selectedLabel: labels[currentValue],
      }}
    >
      <div className="relative inline-block">{children}</div>
    </SelectContext.Provider>
  );
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect();
    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring",
          className,
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  },
);
SelectTrigger.displayName = "SelectTrigger";

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, selectedLabel } = useSelect();
  return <span className="truncate">{selectedLabel ?? value ?? placeholder}</span>;
}

export function SelectContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useSelect();
  if (!open) return null;
  return (
    <div
      className={cn("absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-md border bg-popover p-1 shadow-xl", className)}
      {...props}
    />
  );
}

export function SelectItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: selected, selectValue, registerLabel } = useSelect();

  React.useEffect(() => {
    registerLabel(value, children);
  }, [children, registerLabel, value]);

  return (
    <button
      type="button"
      onClick={() => selectValue(value)}
      className={cn(
        "block w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:bg-white/5",
        selected === value && "text-[#8A4FFF]",
        className,
      )}
    >
      {children}
    </button>
  );
}
