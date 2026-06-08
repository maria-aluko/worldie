import { describe, expect, it } from "vitest";
import type { Match, MatchStatus, Pick, Stage, Team } from "./types";
import {
  SCORING,
  actualChampion,
  actualGroupStandings,
  actualRunnerUp,
  actualThirdPlace,
  scorePicks,
  teamsReachedByStage,
  totalPoints,
} from "./scoring";

// ---------------------------------------------------------------------------
// Fixture helpers. Everything is hand-built in memory — these tests import only
// pure functions and never touch the database, so a run can't affect real users.
// ---------------------------------------------------------------------------

function team(id: string, group: string | null = null): Team {
  return { id, name: id, code: id.toUpperCase(), flag: "", group };
}

function match(id: string, over: Partial<Match> = {}): Match {
  return {
    id,
    stage: "group",
    group: null,
    homeTeamId: null,
    awayTeamId: null,
    kickoffAt: null,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    ...over,
  };
}

/** A finished knockout match between two teams (scores irrelevant to "reached"). */
function ko(id: string, stage: Stage, home: string, away: string, h = 1, a = 0): Match {
  return match(id, {
    stage,
    homeTeamId: home,
    awayTeamId: away,
    status: "finished",
    homeScore: h,
    awayScore: a,
  });
}

function pick(ref: string, over: Partial<Pick> = {}): Pick {
  return { ref, pickTeamId: null, predHome: null, predAway: null, ...over };
}

/** Group A: a1 > a2 > a3 > a4 once all six matches finish (a1 beats all, etc.). */
function groupATeams(): Team[] {
  return [team("a1", "A"), team("a2", "A"), team("a3", "A"), team("a4", "A")];
}

function groupAFinished(): Match[] {
  const win = (id: string, home: string, away: string) =>
    match(id, {
      stage: "group",
      group: "A",
      homeTeamId: home,
      awayTeamId: away,
      status: "finished" as MatchStatus,
      homeScore: 1,
      awayScore: 0,
    });
  return [
    win("A1", "a1", "a2"),
    win("A2", "a1", "a3"),
    win("A3", "a1", "a4"),
    win("A4", "a2", "a3"),
    win("A5", "a2", "a4"),
    win("A6", "a3", "a4"),
  ];
}

describe("teamsReachedByStage", () => {
  it("collects home and away teams per knockout stage", () => {
    const reached = teamsReachedByStage([
      ko("q1", "qf", "t1", "t2"),
      ko("q2", "qf", "t3", "t4"),
      ko("s1", "sf", "t1", "t3"),
    ]);
    expect(reached.reach_qf).toEqual(new Set(["t1", "t2", "t3", "t4"]));
    expect(reached.reach_sf).toEqual(new Set(["t1", "t3"]));
  });
});

describe("actualGroupStandings", () => {
  it("returns 1..4 positions only when every group match has finished", () => {
    const pos = actualGroupStandings(groupAFinished(), groupATeams());
    expect(pos.get("a1")).toBe(1);
    expect(pos.get("a2")).toBe(2);
    expect(pos.get("a3")).toBe(3);
    expect(pos.get("a4")).toBe(4);
  });

  it("skips a group while any of its matches is still unfinished", () => {
    const matches = groupAFinished();
    matches[0] = { ...matches[0], status: "scheduled", homeScore: null, awayScore: null };
    const pos = actualGroupStandings(matches, groupATeams());
    expect(pos.size).toBe(0);
  });
});

describe("actual podium helpers", () => {
  it("derive champion/runner-up from a finished final", () => {
    const final = [ko("F", "final", "win", "lose", 2, 1)];
    expect(actualChampion(final)).toBe("win");
    expect(actualRunnerUp(final)).toBe("lose");
  });

  it("return null until the final is finished", () => {
    const final = [match("F", { stage: "final", homeTeamId: "x", awayTeamId: "y" })];
    expect(actualChampion(final)).toBeNull();
    expect(actualRunnerUp(final)).toBeNull();
  });

  it("derive third place from the playoff winner", () => {
    expect(actualThirdPlace([ko("3P", "third", "bronze", "fourth", 3, 0)])).toBe("bronze");
  });
});

describe("scorePicks — group position", () => {
  const teams = groupATeams();
  const matches = groupAFinished();

  it("awards points only for the exact final position", () => {
    const [hit] = scorePicks([pick("group_pos:A:1", { pickTeamId: "a1" })], matches, teams);
    expect(hit.points).toBe(SCORING.groupPosition);
  });

  it("awards nothing for a wrong position", () => {
    const [miss] = scorePicks([pick("group_pos:A:2", { pickTeamId: "a1" })], matches, teams);
    expect(miss.points).toBe(0);
  });
});

describe("scorePicks — advancement", () => {
  const teams = [team("t1"), team("t2"), team("t3")];
  const matches = [ko("q1", "qf", "t1", "t2")];

  it("awards the stage value when the team reached that stage", () => {
    const [hit] = scorePicks([pick("reach_qf", { pickTeamId: "t1" })], matches, teams);
    expect(hit.points).toBe(SCORING.reach.reach_qf);
  });

  it("awards nothing when the team did not reach that stage", () => {
    const [miss] = scorePicks([pick("reach_qf", { pickTeamId: "t3" })], matches, teams);
    expect(miss.points).toBe(0);
  });

  it("scores best-third (reach_r32_third) against the R32 reached set", () => {
    const r32 = [ko("r1", "r32", "t1", "t2")];
    const [hit] = scorePicks(
      [pick("reach_r32_third", { pickTeamId: "t1" })],
      r32,
      teams,
    );
    expect(hit.points).toBe(SCORING.reach.reach_r32_third);
  });
});

describe("scorePicks — podium & golden boot", () => {
  const teams = [team("win"), team("lose"), team("bronze")];
  const final = [ko("F", "final", "win", "lose", 2, 1), ko("3P", "third", "bronze", "x", 1, 0)];

  it("scores a correct champion and runner-up", () => {
    const scored = scorePicks(
      [pick("champion", { pickTeamId: "win" }), pick("runner_up", { pickTeamId: "lose" })],
      final,
      teams,
    );
    expect(totalPoints(scored)).toBe(SCORING.champion + SCORING.runnerUp);
  });

  it("scores a wrong champion as zero", () => {
    const [miss] = scorePicks([pick("champion", { pickTeamId: "lose" })], final, teams);
    expect(miss.points).toBe(0);
  });

  it("scores third place from the playoff winner", () => {
    const [hit] = scorePicks([pick("third_place", { pickTeamId: "bronze" })], final, teams);
    expect(hit.points).toBe(SCORING.thirdPlace);
  });

  it("scores the golden boot only when it matches opts.goldenBoot", () => {
    const [hit] = scorePicks([pick("golden_boot", { pickTeamId: "win" })], final, teams, {
      goldenBoot: "win",
    });
    const [miss] = scorePicks([pick("golden_boot", { pickTeamId: "lose" })], final, teams, {
      goldenBoot: "win",
    });
    expect(hit.points).toBe(SCORING.goldenBoot);
    expect(miss.points).toBe(0);
  });
});

describe("scorePicks — match scoreline (Expert)", () => {
  const teams = [team("h"), team("a")];
  const finished = [
    match("M1", { homeTeamId: "h", awayTeamId: "a", status: "finished", homeScore: 1, awayScore: 0 }),
  ];

  it("awards the winner value for the correct outcome only", () => {
    const [hit] = scorePicks([pick("M1", { predHome: 2, predAway: 1 })], finished, teams);
    expect(hit.points).toBe(SCORING.groupWinner);
  });

  it("adds the exact-score bonus for a perfect scoreline", () => {
    const [hit] = scorePicks([pick("M1", { predHome: 1, predAway: 0 })], finished, teams);
    expect(hit.points).toBe(SCORING.groupWinner + SCORING.exactScoreBonus);
  });

  it("awards nothing for the wrong winner", () => {
    const [miss] = scorePicks([pick("M1", { predHome: 0, predAway: 1 })], finished, teams);
    expect(miss.points).toBe(0);
  });

  it("does not score an unfinished match", () => {
    const scheduled = [match("M1", { homeTeamId: "h", awayTeamId: "a" })];
    const scored = scorePicks([pick("M1", { predHome: 1, predAway: 0 })], scheduled, teams);
    expect(scored).toHaveLength(0);
  });
});

describe("totalPoints", () => {
  it("sums the points of every scored pick", () => {
    expect(
      totalPoints([
        { ref: "a", pickTeamId: null, points: 7, detail: "" },
        { ref: "b", pickTeamId: null, points: 0, detail: "" },
        { ref: "c", pickTeamId: null, points: 3, detail: "" },
      ]),
    ).toBe(10);
  });
});
