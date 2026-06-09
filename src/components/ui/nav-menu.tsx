"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const trigger =
  "inline-flex items-center justify-center gap-1 font-display font-bold uppercase tracking-wide text-xs px-3 h-9 rounded-full bg-transparent text-muted transition-all duration-200 hover:text-paper hover:bg-white/5 active:scale-[0.97] select-none";

export function NavMenu({
  label,
  children,
  align = "right",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close when the route changes (after selecting an item). Adjusting state
  // during render is the recommended alternative to a setState-in-effect.
  const [prevPath, setPrevPath] = React.useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // Close on outside click and Escape.
  React.useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={trigger}
      >
        {label}
        <Caret open={open} />
      </button>
      {open && (
        <div
          role="menu"
          // Clicking any item dismisses the menu.
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-44 overflow-hidden rounded-2xl border border-white/10 bg-ink/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const navMenuItemClass =
  "block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-faint transition-colors hover:bg-white/5 hover:text-paper";

export function NavMenuItem({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} role="menuitem" className={cn(navMenuItemClass, className)}>
      {children}
    </Link>
  );
}

export function NavMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-faint/60">
      {children}
    </p>
  );
}

export function NavMenuDivider() {
  return <div className="my-1 h-px bg-white/10" />;
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("transition-transform duration-200", open && "rotate-180")}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
