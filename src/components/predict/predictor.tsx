"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Level, Match, Team } from "@/lib/types";
import { LEVELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { Flag } from "@/components/ui/flag";
import { createEntry } from "@/lib/actions/entry";
import { createGroup, joinGroup } from "@/lib/actions/group";
import {
  effectiveThirdPlace,
  emptyState,
  flattenToPicks,
  qualifiers,
  thirdPlaceCandidates,
  type PredictionState,
} from "@/lib/predict/model";
import { isPickLocked } from "@/lib/predict/locks";
import { SelectN } from "./steps/select-n";
import { GroupQualifiers } from "./steps/group-qualifiers";
import { GroupScores } from "./steps/group-scores";
import { ChampionPick } from "./steps/champion-pick";
import { GoldenBoot } from "./steps/golden-boot";

interface Step {
  key: string;
  title: string;
  subtitle: string;
  valid: boolean;
  node: React.ReactNode;
}

/** Where the predictor sends the player once their entry is saved. */
export type GroupContext =
  | { mode: "create"; name: string }
  | { mode: "join"; inviteCode: string };

export function Predictor({
  level,
  teams,
  matches,
  lockMatches,
  now,
  groupContext,
  initialState,
  initialName,
  editing = false,
}: {
  level: Level;
  teams: Team[];
  matches: Match[];
  /** Authoritative matches (with real kickoffs/results) driving the rolling lock. */
  lockMatches: Match[];
  /** Server timestamp so lock state renders identically on server and client. */
  now: number;
  groupContext?: GroupContext;
  initialState?: PredictionState;
  initialName?: string;
  editing?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<PredictionState>(() => initialState ?? emptyState());
  const [index, setIndex] = useState(0);
  const [name, setName] = useState(initialName ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const groups = useMemo(
    () => [...new Set(teams.map((t) => t.group).filter(Boolean))].sort() as string[],
    [teams],
  );
  const teamsByGroup = useMemo(() => {
    const m: Record<string, Team[]> = {};
    for (const g of groups) m[g] = teams.filter((t) => t.group === g);
    return m;
  }, [groups, teams]);
  const matchesByGroup = useMemo(() => {
    const m: Record<string, Match[]> = {};
    for (const g of groups) m[g] = matches.filter((mt) => mt.group === g);
    return m;
  }, [groups, matches]);

  // Rolling lock state, computed from the authoritative matches. A pick is
  // locked once the match/round that decides it has kicked off; locked picks are
  // read-only and excluded from this step's validity so a late entrant who can no
  // longer fill them can still move on.
  const refLocked = useMemo(
    () =>
      (ref: string, teamId: string | null = null) =>
        isPickLocked(ref, teamId, lockMatches, teamsById, now),
    [lockMatches, teamsById, now],
  );
  const lockedGroups = useMemo(
    () => new Set(groups.filter((g) => refLocked(`group_pos:${g}:1`))),
    [groups, refLocked],
  );
  const lockedMatchIds = useMemo(
    () => new Set(matches.filter((m) => refLocked(m.id)).map((m) => m.id)),
    [matches, refLocked],
  );
  const stageLocked = useMemo(
    () => ({
      third: refLocked("reach_r32_third"),
      r16: refLocked("reach_r16"),
      qf: refLocked("reach_qf"),
      sf: refLocked("reach_sf"),
      final: refLocked("reach_final"),
      champion: refLocked("champion"),
      bronze: refLocked("third_place"),
      golden: refLocked("golden_boot"),
    }),
    [refLocked],
  );

  const pick = (ids: string[]) => ids.map((id) => teamsById.get(id)!).filter(Boolean);

  // Helpers to mutate state immutably.
  const toggleIn = (key: keyof PredictionState, id: string, max: number) =>
    setState((s) => {
      const cur = (s[key] as string[]) ?? [];
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < max
          ? [...cur, id]
          : cur;
      return { ...s, [key]: next };
    });

  const quals = qualifiers(level, state, teams, matches);
  const thirdCandidates = thirdPlaceCandidates(state);
  const bronzeCandidates = state.reach_sf.filter((id) => !state.finalists.includes(id));

  const steps: Step[] = useMemo(() => {
    const meta = LEVELS[level];
    const list: Step[] = [];

    // group stage
    if (level === "standard") {
        list.push({
          key: "groups",
          title: "Who escapes the groups?",
          subtitle: "Rank all four teams in every group, 1 → 4.",
          valid: groups.every(
            (g) => lockedGroups.has(g) || (state.groupRanks[g]?.length ?? 0) === 4,
          ),
          node: (
            <GroupQualifiers
              groups={groups}
              teamsByGroup={teamsByGroup}
              value={state.groupRanks}
              lockedGroups={lockedGroups}
              onChange={(g, ids) =>
                setState((s) => ({ ...s, groupRanks: { ...s.groupRanks, [g]: ids } }))
              }
            />
          ),
        });
      } else {
        list.push({
          key: "scores",
          title: "Predict every group score",
          subtitle: "Tables update live — top 2 plus the 8 best 3rd-placed teams advance.",
          valid: matches.every(
            (m) => lockedMatchIds.has(m.id) || state.groupScores[m.id] != null,
          ),
          node: (
            <GroupScores
              groups={groups}
              teamsByGroup={teamsByGroup}
              matchesByGroup={matchesByGroup}
              teamsById={teamsById}
              value={state.groupScores}
              luckyLosers={new Set(effectiveThirdPlace("expert", state, teams, matches))}
              lockedMatches={lockedMatchIds}
              onSet={(id, score) =>
                setState((s) => ({ ...s, groupScores: { ...s.groupScores, [id]: score } }))
              }
            />
          ),
        });
      }

      // Standard players choose the 8 lucky losers from the 12 teams they
      // designated 3rd; expert auto-solves this from the predicted scorelines.
      if (level === "standard") {
        list.push({
          key: "third",
          title: "Best third-placed teams",
          subtitle: "8 of your 12 third-placed teams also qualify. Which ones make it?",
          valid: stageLocked.third || state.thirdPlace.length === 8,
          node: (
            <SelectN
              teams={pick(thirdCandidates)}
              selected={state.thirdPlace}
              max={8}
              locked={stageLocked.third}
              onToggle={(id) => toggleIn("thirdPlace", id, 8)}
            />
          ),
        });
      }
      list.push({
        key: "r16",
        title: "Round of 32",
        subtitle: "16 of your 32 qualifiers advance. Who survives?",
        valid: stageLocked.r16 || state.reach_r16.length === 16,
        node: (
          <SelectN
            teams={pick(quals)}
            selected={state.reach_r16}
            max={16}
            locked={stageLocked.r16}
            onToggle={(id) => toggleIn("reach_r16", id, 16)}
          />
        ),
      });
      list.push({
        key: "qf",
        title: "Quarter-finals",
        subtitle: "Pick the 8 still standing.",
        valid: stageLocked.qf || state.reach_qf.length === 8,
        node: (
          <SelectN
            teams={pick(state.reach_r16)}
            selected={state.reach_qf}
            max={8}
            locked={stageLocked.qf}
            onToggle={(id) => toggleIn("reach_qf", id, 8)}
          />
        ),
      });
      list.push({
        key: "sf",
        title: "Semi-finals",
        subtitle: "Your final four.",
        valid: stageLocked.sf || state.reach_sf.length === 4,
        node: (
          <SelectN
            teams={pick(state.reach_qf)}
            selected={state.reach_sf}
            max={4}
            locked={stageLocked.sf}
            onToggle={(id) => toggleIn("reach_sf", id, 4)}
          />
        ),
      });
      list.push({
        key: "final",
        title: "The Final",
        subtitle: "Two teams left. Who makes it?",
        valid: stageLocked.final || state.finalists.length === 2,
        node: (
          <SelectN
            teams={pick(state.reach_sf)}
            selected={state.finalists}
            max={2}
            locked={stageLocked.final}
            onToggle={(id) => toggleIn("finalists", id, 2)}
          />
        ),
      });
      list.push({
        key: "champion",
        title: "Crown your champion",
        subtitle: "The moment of truth.",
        valid: stageLocked.champion || state.champion != null,
        node: (
          <ChampionPick
            candidates={pick(state.finalists)}
            value={state.champion}
            locked={stageLocked.champion}
            onSelect={(id) => setState((s) => ({ ...s, champion: id }))}
          />
        ),
      });
      list.push({
        key: "bronze",
        title: "The bronze medal",
        subtitle: "Which beaten semi-finalist wins the third-place playoff?",
        valid:
          stageLocked.bronze || (state.bronze != null && bronzeCandidates.includes(state.bronze)),
        node: (
          <ChampionPick
            candidates={pick(bronzeCandidates)}
            value={state.bronze}
            tone="bronze"
            locked={stageLocked.bronze}
            onSelect={(id) => setState((s) => ({ ...s, bronze: id }))}
          />
        ),
      });
      list.push({
        key: "golden",
        title: "Golden Boot",
        subtitle: "Whose nation tops the scoring charts?",
        valid: stageLocked.golden || state.goldenBoot != null,
        node: (
          <GoldenBoot
            teams={teams}
            value={state.goldenBoot}
            locked={stageLocked.golden}
            onSelect={(id) => setState((s) => ({ ...s, goldenBoot: id }))}
          />
        ),
      });

    // Review step (all levels)
    list.push({
      key: "review",
      title: "Lock it in",
      subtitle: meta.tagline,
      valid: true,
      node: (
        <Review
          state={state}
          teamsById={teamsById}
          name={name}
          onName={setName}
        />
      ),
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    level,
    state,
    name,
    groups,
    teamsByGroup,
    matchesByGroup,
    teamsById,
    lockedGroups,
    lockedMatchIds,
    stageLocked,
  ]);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const progress = Math.round(((index + 1) / steps.length) * 100);
  const finishLabel =
    groupContext?.mode === "create"
      ? "Create group →"
      : groupContext?.mode === "join"
        ? "Join group →"
        : editing
          ? "Save changes →"
          : "Get my card →";

  function next() {
    setError(null);
    if (isLast) return submit();
    if (!step.valid) {
      setError("Finish this step to continue.");
      return;
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    setError(null);
    setIndex((i) => Math.max(0, i - 1));
  }

  function submit() {
    start(async () => {
      const picks = flattenToPicks(level, state, teams, matches);
      const res = await createEntry({
        level,
        displayName: name.trim() || undefined,
        picks,
      });
      if (!res.ok || !res.slug || !res.entryId) {
        setError(res.error ?? "Something went wrong.");
        return;
      }

      // No group context → the standard share flow.
      if (!groupContext) {
        router.push(`/p/${res.slug}`);
        return;
      }

      // Finish the entry straight into a group.
      if (groupContext.mode === "create") {
        const g = await createGroup({ name: groupContext.name, entryId: res.entryId });
        if (g.ok && g.slug) router.push(`/g/${g.slug}`);
        else setError(g.error ?? "Could not create the group.");
      } else {
        const g = await joinGroup({
          inviteCode: groupContext.inviteCode,
          entryId: res.entryId,
        });
        if (g.ok) router.push(`/g/${groupContext.inviteCode}`);
        else setError(g.error ?? "Could not join the group.");
      }
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Wordmark />
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted">
            {LEVELS[level].name}
          </span>
        </div>
        <div className="h-1 w-full bg-ink-500">
          <motion.div
            className="h-full bg-lime"
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.4 }}
          />
        </div>
      </header>

      {/* body */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-faint">
            Step {index + 1} of {steps.length}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
            {step.title}
          </h1>
          <p className="mt-1 text-muted">{step.subtitle}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {step.node}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* footer nav */}
      <footer className="sticky bottom-0 z-40 border-t border-white/5 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <Button variant="ghost" onClick={back} disabled={index === 0 || pending}>
            ← Back
          </Button>
          {error && <p className="text-sm text-magenta">{error}</p>}
          <Button onClick={next} disabled={pending || !step.valid}>
            {pending ? "Saving…" : isLast ? finishLabel : "Continue →"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Review({
  state,
  teamsById,
  name,
  onName,
}: {
  state: PredictionState;
  teamsById: Map<string, Team>;
  name: string;
  onName: (v: string) => void;
}) {
  const champ = state.champion ? teamsById.get(state.champion) : null;
  const runnerUpId = state.finalists.find((id) => id !== state.champion);
  const podium: { medal: string; label: string; team?: Team }[] = [
    { medal: "🥇", label: "Champion", team: champ ?? undefined },
    {
      medal: "🥈",
      label: "Runner-up",
      team: runnerUpId ? teamsById.get(runnerUpId) : undefined,
    },
    { medal: "🥉", label: "Third", team: state.bronze ? teamsById.get(state.bronze) : undefined },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-gold">Your podium</p>
        {champ ? (
          <>
            <div className="mt-3 text-7xl">
              <Flag flag={champ.flag} />
            </div>
            <div className="mt-2 font-display text-3xl font-extrabold">{champ.name}</div>
          </>
        ) : (
          <p className="mt-3 text-muted">No champion picked yet.</p>
        )}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {podium.map(({ medal, label, team }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-ink-600/40 px-2 py-3 text-center"
            >
              <div className="text-2xl">{medal}</div>
              <div className="mt-1 text-2xl">{team ? <Flag flag={team.flag} /> : "—"}</div>
              <div className="mt-1 truncate text-sm font-semibold">{team?.code ?? ""}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-faint">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-muted">
          Add your name (optional) — shows on your shareable card
        </label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Maria"
          className="h-12 w-full rounded-2xl border border-white/10 bg-ink-600/60 px-4 text-paper outline-none placeholder:text-faint focus:border-lime"
        />
      </div>
    </div>
  );
}
