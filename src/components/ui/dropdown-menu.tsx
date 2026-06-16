"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MenuContext = React.createContext<MenuContextValue | null>(null);

function useMenu() {
  const context = React.useContext(MenuContext);
  if (!context) throw new Error("DropdownMenu components must be used inside DropdownMenu");
  return context;
}

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </MenuContext.Provider>
  );
}

interface TriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function DropdownMenuTrigger({ asChild, children, className, ...props }: TriggerProps) {
  const { open, setOpen } = useMenu();
  const onClick = () => setOpen(!open);

  if (asChild && React.isValidElement<{ onClick?: React.MouseEventHandler }>(children)) {
    return React.cloneElement(children, {
      onClick: (event) => {
        children.props.onClick?.(event);
        onClick();
      },
      "aria-expanded": open,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button className={className} aria-expanded={open} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  className,
  align = "start",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" }) {
  const { open } = useMenu();
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 min-w-40 overflow-hidden rounded-md border bg-popover p-1 shadow-xl",
        align === "end" ? "right-0" : "left-0",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuItem({ className, onClick, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { setOpen } = useMenu();
  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn("flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none", className)}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
}
