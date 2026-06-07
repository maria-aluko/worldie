import { TEAMS_BY_ID } from "@/lib/data/teams";
import { pct } from "@/lib/utils";

export interface DistRow {
  teamId: string;
  count: number;
}

export function Distribution({
  rows,
  total,
  limit = 10,
  accent = "lime",
}: {
  rows: DistRow[];
  total: number;
  limit?: number;
  accent?: "lime" | "cyan" | "magenta" | "gold";
}) {
  const bar: Record<string, string> = {
    lime: "bg-lime",
    cyan: "bg-cyan",
    magenta: "bg-magenta",
    gold: "bg-gold",
  };
  const top = rows.slice(0, limit);
  if (!top.length) {
    return <p className="text-sm text-faint">No picks yet — be the first!</p>;
  }
  return (
    <div className="space-y-2.5">
      {top.map((r) => {
        const t = TEAMS_BY_ID.get(r.teamId);
        const p = pct(r.count, total);
        return (
          <div key={r.teamId} className="flex items-center gap-3">
            <span className="w-7 text-xl">{t?.flag ?? "🏳️"}</span>
            <span className="w-24 shrink-0 truncate text-sm font-semibold">
              {t?.name ?? r.teamId}
            </span>
            <div className="relative h-7 flex-1 overflow-hidden rounded-full bg-ink-500">
              <div
                className={`h-full rounded-full ${bar[accent]}`}
                style={{ width: `${Math.max(p, 2)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums">
              {p}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
