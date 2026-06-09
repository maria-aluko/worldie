import { pct } from "@/lib/utils";

/** Album completion bar: collected (owned + swappable) out of total. */
export function ProgressBar({ collected, total }: { collected: number; total: number }) {
  const percent = pct(collected, total);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold">
        <span className="text-muted">
          <span className="text-paper tabular-nums">{collected}</span> / {total} collected
        </span>
        <span className="tabular-nums text-lime">{percent}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-lime transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
