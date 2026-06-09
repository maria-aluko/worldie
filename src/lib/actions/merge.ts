import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/**
 * Fold `fromUserId`'s data into `toUserId` (the canonical identity being adopted
 * — via a magic link or a linked Google account). On conflicts (an entry at the
 * same level, membership of the same group, or a status for the same sticker)
 * the target identity wins and the source's duplicate is dropped. Finally the
 * now-empty source user is deleted.
 *
 * Shared by the device-to-device claim flow (`claim.ts`) and Google login
 * (`/api/auth/google/callback`).
 */
export async function mergeUsers(fromUserId: string, toUserId: string): Promise<void> {
  // Entries: move levels the target lacks; drop duplicates.
  const targetLevels = new Set(
    (
      await db
        .select({ level: schema.entries.level })
        .from(schema.entries)
        .where(eq(schema.entries.userId, toUserId))
    ).map((r) => r.level),
  );
  const fromEntries = await db
    .select({ id: schema.entries.id, level: schema.entries.level })
    .from(schema.entries)
    .where(eq(schema.entries.userId, fromUserId));
  for (const e of fromEntries) {
    if (targetLevels.has(e.level)) {
      await db.delete(schema.entries).where(eq(schema.entries.id, e.id));
    } else {
      await db
        .update(schema.entries)
        .set({ userId: toUserId })
        .where(eq(schema.entries.id, e.id));
      targetLevels.add(e.level);
    }
  }

  // Memberships: move groups the target isn't in; drop duplicates.
  const targetGroups = new Set(
    (
      await db
        .select({ groupId: schema.groupMembers.groupId })
        .from(schema.groupMembers)
        .where(eq(schema.groupMembers.userId, toUserId))
    ).map((r) => r.groupId),
  );
  const fromMemberships = await db
    .select({ groupId: schema.groupMembers.groupId })
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.userId, fromUserId));
  for (const m of fromMemberships) {
    const where = and(
      eq(schema.groupMembers.groupId, m.groupId),
      eq(schema.groupMembers.userId, fromUserId),
    );
    if (targetGroups.has(m.groupId)) {
      await db.delete(schema.groupMembers).where(where);
    } else {
      await db.update(schema.groupMembers).set({ userId: toUserId }).where(where);
      targetGroups.add(m.groupId);
    }
  }

  // Sticker statuses: move stickers the target hasn't touched; drop duplicates.
  const targetStickers = new Set(
    (
      await db
        .select({ stickerId: schema.userStickers.stickerId })
        .from(schema.userStickers)
        .where(eq(schema.userStickers.userId, toUserId))
    ).map((r) => r.stickerId),
  );
  const fromStickers = await db
    .select({ stickerId: schema.userStickers.stickerId })
    .from(schema.userStickers)
    .where(eq(schema.userStickers.userId, fromUserId));
  for (const s of fromStickers) {
    const where = and(
      eq(schema.userStickers.userId, fromUserId),
      eq(schema.userStickers.stickerId, s.stickerId),
    );
    if (targetStickers.has(s.stickerId)) {
      await db.delete(schema.userStickers).where(where);
    } else {
      await db.update(schema.userStickers).set({ userId: toUserId }).where(where);
      targetStickers.add(s.stickerId);
    }
  }

  await db.delete(schema.users).where(eq(schema.users.id, fromUserId));
}
