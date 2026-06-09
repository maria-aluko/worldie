import { describe, expect, it } from "vitest";
import { TEAMS } from "@/lib/data/teams";
import { buildGroupFixtures } from "@/lib/data/fixtures";
import { GROUP_LETTERS } from "@/lib/constants";
import { THIRD_PLACE_ALLOCATION } from "@/lib/data/third-place-allocation";
import type { Level } from "@/lib/types";
import {
  emptyState,
  flattenToPicks,
  qualifiers,
  unflattenPicks,
  type PredictionState,
} from "./model";
import { normalizeBracket, resolveBracket, roundComplete, setTieWinner } from "./bracket";

const teams = TEAMS;
const matches = buildGroupFixtures();

// Groups whose 3rd-placed team may be drawn into each winner slot (the R32 table).
const SLOT_CANDIDATES: Record<string, string> = {
  "1A": "CEFHI",
  "1B": "EFGIJ",
  "1D": "BEFIJ",
  "1E": "ABCDF",
  "1G": "AEHIJ",
  "1I": "CDFGH",
  "1K": "DEIJL",
  "1L": "EHIJK",
};

/** A fully-specified standard prediction: every group ranked, 8 thirds chosen. */
function completeStandardState(
  thirdGroups = ["A", "B", "C", "D", "E", "F", "G", "H"],
): PredictionState {
  const s = emptyState();
  for (const g of GROUP_LETTERS) {
    s.groupRanks[g] = teams.filter((t) => t.group === g).map((t) => t.id);
  }
  s.thirdPlace = thirdGroups.map((g) => s.groupRanks[g][2]);
  return s;
}

/** Advance the home side of every tie through the semi-finals. */
function pickAllHome(level: Level, start: PredictionState): PredictionState {
  let s = start;
  for (const stage of ["r32", "r16", "qf", "sf"] as const) {
    const b = resolveBracket(level, s, teams, matches);
    const ties = b[stage];
    for (const t of ties) s = setTieWinner(level, s, teams, matches, stage, t, t.homeId!);
  }
  return s;
}

describe("THIRD_PLACE_ALLOCATION", () => {
  it("has exactly 495 combinations", () => {
    expect(Object.keys(THIRD_PLACE_ALLOCATION)).toHaveLength(495);
  });

  it("assigns each third within its candidate set and covers exactly the key's groups", () => {
    for (const [key, mapping] of Object.entries(THIRD_PLACE_ALLOCATION)) {
      expect(key).toHaveLength(8);
      expect(Object.keys(mapping).sort()).toEqual([
        "1A",
        "1B",
        "1D",
        "1E",
        "1G",
        "1I",
        "1K",
        "1L",
      ]);
      for (const [slot, g] of Object.entries(mapping)) {
        expect(SLOT_CANDIDATES[slot]).toContain(g);
        expect(key).toContain(g);
      }
      const assigned = [...new Set(Object.values(mapping))].sort().join("");
      expect(assigned).toBe(key);
    }
  });
});

describe("resolveBracket", () => {
  it("builds 16 R32 ties whose 32 teams are exactly the qualifiers, none repeated", () => {
    const s = completeStandardState();
    const b = resolveBracket("standard", s, teams, matches);
    expect(b.r32).toHaveLength(16);
    const ids = b.r32.flatMap((t) => [t.homeId, t.awayId]);
    expect(ids.every((x) => x != null)).toBe(true);
    const set = new Set(ids as string[]);
    expect(set.size).toBe(32);
    expect(set).toEqual(new Set(qualifiers("standard", s, teams, matches)));
  });

  it("places fixed ties by group position (M73 = 2A vs 2B)", () => {
    const s = completeStandardState();
    const b = resolveBracket("standard", s, teams, matches);
    const m73 = b.r32.find((t) => t.id === "M73")!;
    expect(m73.homeId).toBe(s.groupRanks["A"][1]);
    expect(m73.awayId).toBe(s.groupRanks["B"][1]);
  });

  it("draws the allocated third-placed team into a winner-vs-third tie (M74 = 1E vs allocated 3rd)", () => {
    const s = completeStandardState();
    const b = resolveBracket("standard", s, teams, matches);
    const m74 = b.r32.find((t) => t.id === "M74")!;
    expect(m74.homeId).toBe(s.groupRanks["E"][0]); // winner of group E
    const allocatedGroup = THIRD_PLACE_ALLOCATION["ABCDEFGH"]["1E"];
    expect(m74.awayId).toBe(s.groupRanks[allocatedGroup][2]);
  });
});

describe("setTieWinner cascade pruning", () => {
  it("completes every round when picking through to champion and bronze", () => {
    let s = pickAllHome("standard", completeStandardState());
    let b = resolveBracket("standard", s, teams, matches);
    s = setTieWinner("standard", s, teams, matches, "final", b.final, b.final.homeId!);
    b = resolveBracket("standard", s, teams, matches);
    s = setTieWinner("standard", s, teams, matches, "third", b.third, b.third.homeId!);

    b = resolveBracket("standard", s, teams, matches);
    expect(roundComplete(b.r32)).toBe(true);
    expect(roundComplete(b.r16)).toBe(true);
    expect(roundComplete(b.qf)).toBe(true);
    expect(roundComplete(b.sf)).toBe(true);
    expect(s.reach_r16).toHaveLength(16);
    expect(s.reach_qf).toHaveLength(8);
    expect(s.reach_sf).toHaveLength(4);
    expect(s.finalists).toHaveLength(2);
    expect(s.champion).not.toBeNull();
    expect(s.bronze).not.toBeNull();
  });

  it("drops downstream picks when an upstream winner is flipped", () => {
    let s = pickAllHome("standard", completeStandardState());
    let b = resolveBracket("standard", s, teams, matches);
    s = setTieWinner("standard", s, teams, matches, "final", b.final, b.final.homeId!);
    b = resolveBracket("standard", s, teams, matches);

    // Flip the R32 tie that the champion advanced from.
    const champTie = b.r32.find((t) => t.homeId === s.champion)!;
    expect(champTie).toBeDefined();
    const flipped = setTieWinner("standard", s, teams, matches, "r32", champTie, champTie.awayId!);

    expect(flipped.champion).toBeNull();
    expect(flipped.reach_r16).not.toContain(champTie.homeId);
    expect(flipped.reach_r16).toContain(champTie.awayId);
    // Invariant: every surviving winner still belongs to a tie in its round.
    const fb = resolveBracket("standard", flipped, teams, matches);
    const inRound = (set: string[], ties: typeof fb.r32) =>
      set.every((id) => ties.some((t) => t.homeId === id || t.awayId === id));
    expect(inRound(flipped.reach_r16, fb.r32)).toBe(true);
    expect(inRound(flipped.reach_qf, fb.r16)).toBe(true);
    expect(inRound(flipped.reach_sf, fb.qf)).toBe(true);
    expect(inRound(flipped.finalists, fb.sf)).toBe(true);
  });
});

describe("normalizeBracket", () => {
  it("strips picks that don't belong to any tie (e.g. legacy free-selection entries)", () => {
    const s = completeStandardState();
    // A bogus knockout pick that can't be a valid tie winner.
    s.reach_r16 = ["NOT_A_TEAM"];
    s.reach_qf = ["ALSO_BOGUS"];
    const n = normalizeBracket("standard", s, teams, matches);
    expect(n.reach_r16).toHaveLength(0);
    expect(n.reach_qf).toHaveLength(0);
  });
});

describe("flatten/unflatten round-trip", () => {
  it("preserves a bracket-built standard prediction", () => {
    let s = pickAllHome("standard", completeStandardState());
    let b = resolveBracket("standard", s, teams, matches);
    s = setTieWinner("standard", s, teams, matches, "final", b.final, b.final.homeId!);
    b = resolveBracket("standard", s, teams, matches);
    s = setTieWinner("standard", s, teams, matches, "third", b.third, b.third.homeId!);

    const picks = flattenToPicks("standard", s, teams, matches);
    const r = unflattenPicks("standard", picks, teams, matches);
    const sorted = (a: string[]) => [...a].sort();
    expect(sorted(r.reach_r16)).toEqual(sorted(s.reach_r16));
    expect(sorted(r.reach_qf)).toEqual(sorted(s.reach_qf));
    expect(sorted(r.reach_sf)).toEqual(sorted(s.reach_sf));
    expect(sorted(r.finalists)).toEqual(sorted(s.finalists));
    expect(sorted(r.thirdPlace)).toEqual(sorted(s.thirdPlace));
    expect(r.champion).toBe(s.champion);
    expect(r.bronze).toBe(s.bronze);
  });
});
