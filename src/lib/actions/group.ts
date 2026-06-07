"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getUserIdFromCookie, setUserIdCookie } from "@/lib/identity";
import { inviteSlug } from "@/lib/slug";

async function ensureUser(): Promise<string> {
  let userId = await getUserIdFromCookie();
  if (userId) {
    const [u] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    if (!u) userId = null;
  }
  if (!userId) {
    const [u] = await db.insert(schema.users).values({}).returning({ id: schema.users.id });
    userId = u.id;
    await setUserIdCookie(userId);
  }
  return userId;
}

/** Load an entry the caller owns; null if missing or not theirs. */
async function ownedEntry(userId: string, entryId: string) {
  const [e] = await db
    .select({ id: schema.entries.id, userId: schema.entries.userId, level: schema.entries.level })
    .from(schema.entries)
    .where(eq(schema.entries.id, entryId))
    .limit(1);
  if (!e || e.userId !== userId) return null;
  return e;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  entryId: z.string().uuid(),
});

/**
 * Create a group seeded by the creator's own prediction. The group's format
 * (level) is inherited from that entry, so every member plays the same way.
 */
export async function createGroup(
  raw: z.infer<typeof createSchema>,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Enter a group name." };
  try {
    const userId = await ensureUser();
    const entry = await ownedEntry(userId, parsed.data.entryId);
    if (!entry) return { ok: false, error: "Make a prediction first." };

    const slug = inviteSlug();
    const [g] = await db
      .insert(schema.groups)
      .values({
        name: parsed.data.name,
        level: entry.level,
        inviteSlug: slug,
        createdByUserId: userId,
      })
      .returning({ id: schema.groups.id });

    await db
      .insert(schema.groupMembers)
      .values({ groupId: g.id, userId, entryId: entry.id })
      .onConflictDoNothing();

    return { ok: true, slug };
  } catch (err) {
    console.error("createGroup failed", err);
    return { ok: false, error: "Could not create group." };
  }
}

const joinSchema = z.object({
  inviteCode: z.string().trim().min(1).max(12),
  entryId: z.string().uuid(),
});

/**
 * Join a group with a prediction made at the group's level. The entry's level
 * must match the group, otherwise the leaderboard wouldn't be comparable.
 */
export async function joinGroup(
  raw: z.infer<typeof joinSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = joinSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Could not join group." };
  try {
    const userId = await ensureUser();
    const [g] = await db
      .select({ id: schema.groups.id, level: schema.groups.level })
      .from(schema.groups)
      .where(eq(schema.groups.inviteSlug, parsed.data.inviteCode))
      .limit(1);
    if (!g) return { ok: false, error: "Group not found." };

    const entry = await ownedEntry(userId, parsed.data.entryId);
    if (!entry) return { ok: false, error: "Make a prediction first." };
    if (entry.level !== g.level) {
      return { ok: false, error: "Your prediction doesn't match this group's format." };
    }

    // Upsert membership; point it at this entry.
    const existing = await db
      .select({ userId: schema.groupMembers.userId })
      .from(schema.groupMembers)
      .where(
        and(eq(schema.groupMembers.groupId, g.id), eq(schema.groupMembers.userId, userId)),
      )
      .limit(1);
    if (existing.length) {
      await db
        .update(schema.groupMembers)
        .set({ entryId: entry.id })
        .where(
          and(eq(schema.groupMembers.groupId, g.id), eq(schema.groupMembers.userId, userId)),
        );
    } else {
      await db
        .insert(schema.groupMembers)
        .values({ groupId: g.id, userId, entryId: entry.id });
    }
    return { ok: true };
  } catch (err) {
    console.error("joinGroup failed", err);
    return { ok: false, error: "Could not join group." };
  }
}
