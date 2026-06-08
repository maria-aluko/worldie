"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ensureUser } from "@/lib/identity";
import { entrySlug } from "@/lib/slug";
import { loadMatches, loadTeams } from "@/lib/actions/score";
import { applyPickLocks } from "@/lib/predict/locks";
import type { Pick } from "@/lib/types";

const pickSchema = z.object({
  ref: z.string().min(1).max(64),
  pickTeamId: z.string().max(8).nullable().optional(),
  predHome: z.number().int().min(0).max(30).nullable().optional(),
  predAway: z.number().int().min(0).max(30).nullable().optional(),
});

const submitSchema = z.object({
  level: z.enum(["standard", "expert"]),
  displayName: z.string().trim().max(40).optional(),
  picks: z.array(pickSchema).min(1).max(400),
});

export type SubmitInput = z.infer<typeof submitSchema>;

export interface SubmitResult {
  ok: boolean;
  slug?: string;
  entryId?: string;
  error?: string;
}

/**
 * Save the caller's prediction for a level. A player has exactly one entry per
 * level: re-submitting edits that entry in place (keeping its share slug so
 * links stay valid) instead of creating duplicates. The single entry is what
 * every group the player joins points at.
 */
export async function createEntry(raw: SubmitInput): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid prediction data." };
  }
  const { level, displayName, picks } = parsed.data;

  try {
    const userId = await ensureUser();

    // Rolling deadlines: a pick is locked once the match/round that decides it
    // has kicked off. `applyPickLocks` preserves the player's already-locked
    // picks and refuses any locked picks in the submission — the real guard (the
    // UI just mirrors it). Because late writes are refused, scoring needs no
    // special-casing: a pick that isn't stored scores 0.
    const matches = await loadMatches();
    const teamsById = new Map((await loadTeams()).map((t) => [t.id, t]));
    const now = Date.now();

    // Re-use the player's existing entry at this level if there is one.
    const [existing] = await db
      .select({ id: schema.entries.id, slug: schema.entries.slug })
      .from(schema.entries)
      .where(and(eq(schema.entries.userId, userId), eq(schema.entries.level, level)))
      .limit(1);

    let entryId: string;
    let slug: string;
    let existingPicks: Pick[] = [];

    if (existing) {
      entryId = existing.id;
      slug = existing.slug;
      await db
        .update(schema.entries)
        .set({ displayName: displayName || null })
        .where(eq(schema.entries.id, entryId));

      const existingRows = await db
        .select()
        .from(schema.entryPicks)
        .where(eq(schema.entryPicks.entryId, entryId));
      existingPicks = existingRows.map((p) => ({
        ref: p.ref,
        pickTeamId: p.pickTeamId,
        predHome: p.predHome,
        predAway: p.predAway,
      }));

      await db.delete(schema.entryPicks).where(eq(schema.entryPicks.entryId, entryId));
    } else {
      slug = entrySlug();
      const [entry] = await db
        .insert(schema.entries)
        .values({ userId, level, slug, displayName: displayName || null })
        .returning({ id: schema.entries.id });
      entryId = entry.id;
    }

    const finalPicks = applyPickLocks(existingPicks, picks, matches, teamsById, now);

    const rows = finalPicks.map((p) => ({
      entryId,
      ref: p.ref,
      pickTeamId: p.pickTeamId ?? null,
      predHome: p.predHome ?? null,
      predAway: p.predAway ?? null,
    }));
    if (rows.length) await db.insert(schema.entryPicks).values(rows);

    return { ok: true, slug, entryId };
  } catch (err) {
    console.error("createEntry failed", err);
    return { ok: false, error: "Could not save your prediction. Please try again." };
  }
}
