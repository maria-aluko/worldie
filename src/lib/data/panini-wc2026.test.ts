import { describe, it, expect } from "vitest";
import { buildPaniniWc2026, PANINI_WC2026_SET_ID } from "./panini-wc2026";
import { TEAMS } from "./teams";

describe("buildPaniniWc2026", () => {
  const album = buildPaniniWc2026();

  it("uses the canonical set id and a non-empty checklist", () => {
    expect(album.id).toBe(PANINI_WC2026_SET_ID);
    expect(album.stickers.length).toBeGreaterThan(0);
  });

  it("numbers stickers sequentially from 1 with no gaps or duplicates", () => {
    const codes = album.stickers.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length); // unique
    codes.forEach((code, i) => expect(code).toBe(String(i + 1))); // 1..N in order
  });

  it("has one section per team plus the intro, with team stickers linked to a team", () => {
    const sections = new Set(album.stickers.map((s) => s.section));
    expect(sections.has("Tournament")).toBe(true);
    for (const team of TEAMS) expect(sections.has(team.name)).toBe(true);

    const teamIds = new Set(TEAMS.map((t) => t.id));
    for (const s of album.stickers) {
      if (s.section === "Tournament") {
        expect(s.teamId).toBeNull();
      } else {
        expect(s.teamId).not.toBeNull();
        expect(teamIds.has(s.teamId!)).toBe(true);
      }
    }
  });
});
