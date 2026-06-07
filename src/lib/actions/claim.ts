"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ensureUser, getUserIdFromCookie, setUserIdCookie } from "@/lib/identity";
import { claimToken } from "@/lib/slug";
import { mailConfigured, sendEmail } from "@/lib/mail";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

const emailSchema = z.string().trim().email().max(120);

export interface ClaimResult {
  ok: boolean;
  error?: string;
  /** Dev-only: when no mailer is configured, the link is returned for testing. */
  devLink?: string;
}

/**
 * Attach an email to the current anonymous player (or target the identity that
 * already owns it) and send a single-use magic link that restores that identity
 * on any device. No password — the email is only used to find the right player.
 */
export async function requestClaim(rawEmail: string): Promise<ClaimResult> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email." };
  const email = parsed.data.toLowerCase();

  try {
    const userId = await ensureUser();

    // If the email is already tied to an identity, the link restores THAT one
    // (so a returning player gets their existing data back). Otherwise bind the
    // email to the current player.
    const [owner] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.claimedEmail, email))
      .limit(1);

    let targetUserId = userId;
    if (owner && owner.id !== userId) {
      targetUserId = owner.id;
    } else if (!owner) {
      await db
        .update(schema.users)
        .set({ claimedEmail: email })
        .where(eq(schema.users.id, userId));
    }

    const token = claimToken();
    await db.insert(schema.claimTokens).values({
      userId: targetUserId,
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    const link = `${siteUrl}/claim/${token}`;
    if (mailConfigured()) {
      await sendEmail({
        to: email,
        subject: "Your Worldie link",
        text: `Open this link to access your Worldie predictions on this device:\n\n${link}\n\nThe link expires in 30 minutes. If you didn't request it, you can ignore this email.`,
        html: `<p>Open this link to access your Worldie predictions on this device:</p>
<p><a href="${link}">${link}</a></p>
<p>The link expires in 30 minutes. If you didn't request it, you can ignore this email.</p>`,
      });
      return { ok: true };
    }

    // No mailer configured (e.g. local dev) — surface the link so it's testable.
    return { ok: true, devLink: link };
  } catch (err) {
    console.error("requestClaim failed", err);
    return { ok: false, error: "Could not send the link. Please try again." };
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
