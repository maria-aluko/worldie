import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wide rounded-full transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97] select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-lime text-ink shadow-[0_0_0_0_rgba(204,255,0,0.5)] hover:shadow-[0_8px_30px_-4px_rgba(204,255,0,0.6)] hover:brightness-105",
  secondary:
    "bg-ink-500 text-paper border border-white/10 hover:bg-ink-400 hover:border-white/20",
  outline:
    "bg-transparent text-paper border border-white/20 hover:border-lime hover:text-lime",
  ghost: "bg-transparent text-muted hover:text-paper hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-4 h-9",
  md: "text-sm px-6 h-12",
  lg: "text-base px-8 h-14",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = StyleProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AnchorProps = StyleProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >;

export function Button(props: ButtonProps | AnchorProps) {
  const { variant = "primary", size = "md", className, children, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if (typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as { href: string };
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
