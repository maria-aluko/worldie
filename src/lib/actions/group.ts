"use server";

import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
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

async function latestEntryId(userId: string): Promise<string | null> {
  const [e] = await db
    .select({ id: schema.entries.id })
    .from(schema.entries)
    .where(eq(schema.entries.userId, userId))
    .orderBy(desc(schema.entries.createdAt))
    .limit(1);
  return e?.id ?? null;
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
  entryId: z.string().uuid().optional(),
});

export async function createGroup(
  raw: z.infer<typeof createSchema>,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Enter a group name." };
  try {
    const userId = await ensureUser();
    const slug = inviteSlug();
    const [g] = await db
      .insert(schema.groups)
      .values({ name: parsed.data.name, inviteSlug: slug, createdByUserId: userId })
      .returning({ id: schema.groups.id });

    const entryId = parsed.data.entryId ?? (await latestEntryId(userId));
    await db
      .insert(schema.groupMembers)
      .values({ groupId: g.id, userId, ...(entryId !== null ? { entryId } : {}) })
      .onConflictDoNothing();

    return { ok: true, slug };
  } catch (err) {
    console.error("createGroup failed", err);
    return { ok: false, error: "Could not create group." };
  }
}

export async function joinGroup(
  inviteCode: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const userId = await ensureUser();
    const [g] = await db
      .select({ id: schema.groups.id })
      .from(schema.groups)
      .where(eq(schema.groups.inviteSlug, inviteCode))
      .limit(1);
    if (!g) return { ok: false, error: "Group not found." };

    const entryId = await latestEntryId(userId);
    // Upsert membership; refresh the attached entry to their latest.
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
        .set({ entryId })
        .where(
          and(eq(schema.groupMembers.groupId, g.id), eq(schema.groupMembers.userId, userId)),
        );
    } else {
      await db.insert(schema.groupMembers).values({ groupId: g.id, userId, ...(entryId !== null ? { entryId } : {}) });
    }
    return { ok: true };
  } catch (err) {
    console.error("joinGroup failed", err);
    return { ok: false, error: "Could not join group." };
  }
}
