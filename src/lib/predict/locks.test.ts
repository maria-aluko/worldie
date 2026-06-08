import { describe, expect, it } from "vitest";
import type { Match, Pick, Stage, Team } from "@/lib/types";
import { applyPickLocks, deadlineForPick, isPickLocked } from "./locks";

const PAST = "2026-06-11T17:00:00Z";
const FUTURE = "2030-01-01T00:00:00Z";
const NOW = Date.parse("2026-06-12T00:00:00Z"); // a few hours after PAST

function team(id: string, group: string | null): Team {
  return { id, name: id, code: id.toUpperCase(), flag: "", group };
}

function match(id: string, stage: Stage, group: string | null, kickoffAt: string | null): Match {
  return {
    id,
    stage,
    group,
    homeTeamId: null,
    awayTeamId: null,
    kickoffAt,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  };
}

const teamsById = new Map<string, Team>([
  ["AA", team("AA", "A")],
  ["BB", team("BB", "B")],
]);

describe("rolling pick locks", () => {
  it("locks a group's ranking once that group has kicked off, but not other groups", () => {
    const matches = [
      match("M-A-1-1", "group", "A", PAST),
      match("M-B-1-1", "group", "B", FUTURE),
    ];
    expect(isPickLocked("group_pos:A:1", null, matches, teamsById, NOW)).toBe(true);
    expect(isPickLocked("group_pos:B:1", null, matches, teamsById, NOW)).toBe(false);
  });

  it("locks reach_r32 by the picked team's group", () => {
    const matches = [
      match("M-A-1-1", "group", "A", PAST),
      match("M-B-1-1", "group", "B", FUTURE),
    ];
    expect(isPickLocked("reach_r32", "AA", matches, teamsById, NOW)).toBe(true);
    expect(isPickLocked("reach_r32", "BB", matches, teamsById, NOW)).toBe(false);
  });

  it("locks lucky-loser and golden-boot picks at the tournament's first kickoff", () => {
    const matches = [match("M-A-1-1", "group", "A", PAST)];
    expect(isPickLocked("reach_r32_third", null, matches, teamsById, NOW)).toBe(true);
    expect(isPickLocked("golden_boot", null, matches, teamsById, NOW)).toBe(true);
  });

  it("locks an advancement pick when its deciding round kicks off", () => {
    // reach_r16 is decided by the R32 round.
    const before = [match("FD-1", "r32", null, FUTURE)];
    const after = [match("FD-1", "r32", null, PAST)];
    expect(isPickLocked("reach_r16", "AA", before, teamsById, NOW)).toBe(false);
    expect(isPickLocked("reach_r16", "AA", after, teamsById, NOW)).toBe(true);
  });

  it("locks champion/runner-up at the final kickoff", () => {
    const matches = [match("FD-99", "final", null, PAST)];
    expect(isPickLocked("champion", "AA", matches, teamsById, NOW)).toBe(true);
    expect(isPickLocked("runner_up", "AA", matches, teamsById, NOW)).toBe(true);
  });

  it("locks an expert scoreline at that match's own kickoff", () => {
    const matches = [
      match("M-A-1-1", "group", "A", PAST),
      match("M-A-1-2", "group", "A", FUTURE),
    ];
    expect(isPickLocked("M-A-1-1", null, matches, teamsById, NOW)).toBe(true);
    expect(isPickLocked("M-A-1-2", null, matches, teamsById, NOW)).toBe(false);
  });

  it("treats an unknown / not-yet-scheduled deadline as not locked", () => {
    // No r32 matches yet → reach_r16 has no known deadline.
    expect(deadlineForPick("reach_r16", "AA", [], teamsById)).toBeNull();
    expect(isPickLocked("reach_r16", "AA", [], teamsById, NOW)).toBe(false);
  });
});

describe("applyPickLocks", () => {
  // Group A has kicked off; group B has not.
  const matches = [
    match("M-A-1-1", "group", "A", PAST),
    match("M-B-1-1", "group", "B", FUTURE),
  ];
  const pick = (ref: string, teamId: string): Pick => ({
    ref,
    pickTeamId: teamId,
    predHome: null,
    predAway: null,
  });

  it("preserves an existing locked pick and ignores attempts to rewrite it", () => {
    const existing = [pick("group_pos:A:1", "AA"), pick("group_pos:B:1", "BB")];
    const incoming = [pick("group_pos:A:1", "BB"), pick("group_pos:B:1", "AA")];
    const out = applyPickLocks(existing, incoming, matches, teamsById, NOW);
    // Locked group A keeps the original team; open group B takes the new value.
    expect(out.find((p) => p.ref === "group_pos:A:1")?.pickTeamId).toBe("AA");
    expect(out.find((p) => p.ref === "group_pos:B:1")?.pickTeamId).toBe("AA");
  });

  it("drops locked picks from a new entry but keeps open ones", () => {
    const incoming = [pick("group_pos:A:1", "AA"), pick("group_pos:B:1", "BB")];
    const out = applyPickLocks([], incoming, matches, teamsById, NOW);
    expect(out.some((p) => p.ref === "group_pos:A:1")).toBe(false);
    expect(out.some((p) => p.ref === "group_pos:B:1")).toBe(true);
  });
});
