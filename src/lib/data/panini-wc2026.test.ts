import { describe, it, expect } from "vitest";
import { buildPaniniWc2026, PANINI_WC2026_SET_ID } from "./panini-wc2026";
import { TEAMS } from "./teams";

describe("buildPaniniWc2026", () => {
  const album = buildPaniniWc2026();

  it("uses the canonical set id", () => {
    expect(album.id).toBe(PANINI_WC2026_SET_ID);
  });

  it("has the expected total: 00 + FWC1-19 + 48×20 teams + 20 extras × 3 tiers", () => {
    expect(album.stickers.length).toBe(1 + 19 + TEAMS.length * 20 + 20 * 3);
  });

  it("uses unique code+tier keys including the tournament foils", () => {
    const keys = album.stickers.map((s) => `${s.code}|${s.tier ?? ""}`);
    expect(new Set(keys).size).toBe(keys.length);
    const codes = album.stickers.map((s) => s.code);
    expect(codes).toContain("00");
    expect(codes).toContain("FWC1");
    expect(codes).toContain("FWC19");
  });

  it("gives every team a Tournament-style section of 20 codes prefixed by its code", () => {
    for (const team of TEAMS) {
      const teamStickers = album.stickers.filter((s) => s.section === team.name);
      expect(teamStickers).toHaveLength(20);
      for (const s of teamStickers) {
        expect(s.code.startsWith(team.code)).toBe(true);
        expect(s.teamId).toBe(team.id);
      }
    }
  });

  it("keeps non-team sections (Tournament, Extra Stickers) unlinked to a team", () => {
    const sections = new Set(album.stickers.map((s) => s.section));
    expect(sections.has("Tournament")).toBe(true);
    expect(sections.has("Extra Stickers")).toBe(true);

    for (const s of album.stickers) {
      if (s.section === "Tournament" || s.section === "Extra Stickers") {
        expect(s.teamId).toBeNull();
      }
    }
    expect(album.stickers.filter((s) => s.section === "Extra Stickers")).toHaveLength(60);
  });

  it("gives each Extra player three finishes (bronze/silver/gold) under its country code", () => {
    const extras = album.stickers.filter((s) => s.section === "Extra Stickers");
    const byCode = new Map<string, Set<string>>();
    for (const s of extras) {
      const tiers = byCode.get(s.code) ?? new Set<string>();
      tiers.add(s.tier ?? "");
      byCode.set(s.code, tiers);
    }
    expect(byCode.size).toBe(20);
    for (const tiers of byCode.values()) {
      expect([...tiers].sort()).toEqual(["bronze", "gold", "silver"]);
    }
  });
});
