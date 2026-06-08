"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ensureUser, getUserIdFromCookie, setUserIdCookie } from "@/lib/identity";
import { claimToken } from "@/lib/slug";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

export interface ShareLinkResult {
  ok: boolean;
  error?: string;
  /** Single-use link that restores the current identity on another device. */
  link?: string;
}

/**
 * Mint a single-use magic link for the current anonymous player. Opening it on
 * another device switches that device to this identity (folding in any data it
 * already had). No email, no password — the link itself is the credential, so
 * it's only shown to the person who generated it.
 */
export async function createShareLink(): Promise<ShareLinkResult> {
  try {
    const userId = await ensureUser();

    const token = claimToken();
    await db.insert(schema.claimTokens).values({
      userId,
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    return { ok: true, link: `${siteUrl}/claim/${token}` };
  } catch (err) {
    console.error("createShareLink failed", err);
    return { ok: false, error: "Could not create a link. Please try again." };
  }
}

/**
 * Redeem a magic link: switch this device to the claimed identity. If the device
 * already had a different identity with data, fold it into the claimed one so
 * nothing is lost. Must run in a Server Action / Route Handler (it sets a cookie).
 */
export async function confirmClaim(token: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const [row] = await db
      .select()
      .from(schema.claimTokens)
      .where(eq(schema.claimTokens.token, token))
      .limit(1);

    if (!row) return { ok: false, error: "This link is invalid." };
    if (row.usedAt) return { ok: false, error: "This link has already been used." };
    if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "This link has expired." };

    const claimedUserId = row.userId;
    const currentUserId = await getUserIdFromCookie();

    if (currentUserId && currentUserId !== claimedUserId) {
      await mergeUsers(currentUserId, claimedUserId);
    }

    await db
      .update(schema.claimTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.claimTokens.id, row.id));
    await setUserIdCookie(claimedUserId);

    return { ok: true };
  } catch (err) {
    console.error("confirmClaim failed", err);
    return { ok: false, error: "Could not complete sign-in." };
  }
}

/**
 * Fold `fromUserId`'s data into `toUserId` (the claimed, canonical identity).
 * On conflicts (an entry at the same level, or membership of the same group)
 * the claimed identity wins and the source's duplicate is dropped. Finally the
 * now-empty source user is deleted.
 */
async function mergeUsers(fromUserId: string, toUserId: string): Promise<void> {
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

  await db.delete(schema.users).where(eq(schema.users.id, fromUserId));
}
