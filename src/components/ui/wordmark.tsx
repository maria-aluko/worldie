import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const inner = (
    <span className={cn("font-display font-extrabold tracking-tight text-xl", className)}>
      <span className="text-paper">WOR</span>
      <span className="text-lime text-glow-lime">L</span>
      <span className="text-paper">DIE</span>
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex items-center group">
      {inner}
    </Link>
  );
}
