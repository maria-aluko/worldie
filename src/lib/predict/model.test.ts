import { describe, expect, it } from "vitest";
import type { Match, Team } from "@/lib/types";
import { deriveStandings } from "./model";

function team(id: string, group = "A"): Team {
  return { id, name: id, code: id.toUpperCase(), flag: "", group };
}

function gameAgainst(id: string, home: string, away: string): Match {
  return {
    id,
    stage: "group",
    group: "A",
    homeTeamId: home,
    awayTeamId: away,
    kickoffAt: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
  };
}

describe("deriveStandings", () => {
  it("orders teams by points (3 for a win, 1 for a draw)", () => {
    const teams = [team("x"), team("y"), team("z")];
    const matches = [
      gameAgainst("m1", "x", "y"),
      gameAgainst("m2", "x", "z"),
      gameAgainst("m3", "y", "z"),
    ];
    const scores = {
      m1: { h: 2, a: 0 }, // x beats y
      m2: { h: 2, a: 0 }, // x beats z
      m3: { h: 1, a: 1 }, // y draws z
    };
    const table = deriveStandings(teams, matches, scores);
    expect(table.map((r) => r.teamId)).toEqual(["x", "y", "z"]);
    expect(table[0].pts).toBe(6);
  });

  it("breaks a points tie on goal difference", () => {
    const teams = [team("x"), team("y"), team("z")];
    const matches = [
      gameAgainst("m1", "x", "z"),
      gameAgainst("m2", "y", "z"),
      gameAgainst("m3", "x", "y"),
    ];
    const scores = {
      m1: { h: 3, a: 0 }, // x +3
      m2: { h: 1, a: 0 }, // y +1
      m3: { h: 0, a: 0 }, // x and y draw
    };
    // x and y both have 4 pts; x has the better goal difference.
    const table = deriveStandings(teams, matches, scores);
    expect(table.map((r) => r.teamId)).toEqual(["x", "y", "z"]);
    expect(table[0].pts).toBe(table[1].pts);
    expect(table[0].gd).toBeGreaterThan(table[1].gd);
  });
});
