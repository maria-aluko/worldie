"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getUserIdFromCookie, setUserIdCookie } from "@/lib/identity";
import { entrySlug } from "@/lib/slug";

const pickSchema = z.object({
  ref: z.string().min(1).max(64),
  pickTeamId: z.string().max(8).nullable().optional(),
  predHome: z.number().int().min(0).max(30).nullable().optional(),
  predAway: z.number().int().min(0).max(30).nullable().optional(),
});

const submitSchema = z.object({
  level: z.enum(["casual", "standard", "expert"]),
  displayName: z.string().trim().max(40).optional(),
  picks: z.array(pickSchema).min(1).max(400),
});

export type SubmitInput = z.infer<typeof submitSchema>;

export interface SubmitResult {
  ok: boolean;
  slug?: string;
  error?: string;
}

export async function createEntry(raw: SubmitInput): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid prediction data." };
  }
  const { level, displayName, picks } = parsed.data;

  try {
    // Resolve (or create) the anonymous player.
    let userId = await getUserIdFromCookie();
    if (userId) {
      const existing = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      if (existing.length === 0) userId = null;
    }
    if (!userId) {
      const [u] = await db
        .insert(schema.users)
        .values({ displayName: displayName || null })
        .returning({ id: schema.users.id });
      userId = u.id;
      await setUserIdCookie(userId);
    }

    const slug = entrySlug();
    const [entry] = await db
      .insert(schema.entries)
      .values({ userId, level, slug, displayName: displayName || null })
      .returning({ id: schema.entries.id });

    const rows = picks.map((p) => ({
      entryId: entry.id,
      ref: p.ref,
      pickTeamId: p.pickTeamId ?? null,
      predHome: p.predHome ?? null,
      predAway: p.predAway ?? null,
    }));
    if (rows.length) await db.insert(schema.entryPicks).values(rows);

    return { ok: true, slug };
  } catch (err) {
    console.error("createEntry failed", err);
    return { ok: false, error: "Could not save your prediction. Please try again." };
  }
}
