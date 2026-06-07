import { ImageResponse } from "next/og";
import { getEntryBySlug, summarize } from "@/lib/queries";
import { LEVELS } from "@/lib/constants";

export const runtime = "nodejs";
export const alt = "Worldie — 2026 World Cup prediction";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: { slug: string };
}) {
  const view = await getEntryBySlug(params.slug).catch(() => null);
  const s = view ? summarize(view.picks) : null;
  const champ = s?.championTeam;
  const name = view?.entry.displayName;
  const level = view ? LEVELS[view.entry.level].name : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #101019 0%, #08080c 60%)",
          color: "#f6f7fb",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            WOR<span style={{ color: "#ccff00" }}>L</span>DIE
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#9aa0b4",
              border: "1px solid #2a2a3a",
              borderRadius: 999,
              padding: "8px 20px",
            }}
          >
            {level}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: 28, color: "#9aa0b4", marginBottom: 12 }}>
            {name ? `${name}'s pick to win the 2026 World Cup` : "My pick to win the 2026 World Cup"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ fontSize: 140 }}>{champ?.flag ?? "🏆"}</div>
            <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: -2 }}>
              {champ?.name ?? "Worldie"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "auto",
            fontSize: 26,
            color: "#5b6075",
          }}
        >
          <span>Make your call →</span>
          <span style={{ color: "#ccff00" }}>worldie</span>
        </div>
      </div>
    ),
    { ...size, emoji: "twemoji" },
  );
}
