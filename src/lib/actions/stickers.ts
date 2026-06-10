"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireLoggedInUser } from "@/lib/identity";

const inputSchema = z.object({
  stickerId: z.string().uuid(),
  status: z.enum(["not_owned", "owned", "desired"]),
  count: z.number().int().min(0).max(99).optional(),
});

export type SetStatusInput = z.infer<typeof inputSchema>;

/**
 * Normalize copies to the status: owned holds ≥1 (copies ≥2 means spares to
 * swap, derived elsewhere), desired (wanted) carries 0.
 */
function copiesFor(status: "owned" | "desired", count: number | undefined): number {
  if (status === "desired") return 0;
  return Math.max(1, count ?? 1);
}

/**
 * Set the current player's status (and copy count) for a sticker. Login-gated:
 * only a player with a linked account can manage an album. "not_owned" clears
 * the row (the sparse default); any other status upserts it.
 */
export async function setStickerStatus(
  raw: SetStatusInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { stickerId, status, count } = parsed.data;

  const user = await requireLoggedInUser();
  if (!user) return { ok: false, error: "Please log in to manage your album." };

  try {
    if (status === "not_owned") {
      await db
        .delete(schema.userStickers)
        .where(
          and(
            eq(schema.userStickers.userId, user.id),
            eq(schema.userStickers.stickerId, stickerId),
          ),
        );
    } else {
      const copies = copiesFor(status, count);
      await db
        .insert(schema.userStickers)
        .values({ userId: user.id, stickerId, status, count: copies })
        .onConflictDoUpdate({
          target: [schema.userStickers.userId, schema.userStickers.stickerId],
          set: { status, count: copies, updatedAt: new Date() },
        });
    }
    return { ok: true };
  } catch (err) {
    console.error("setStickerStatus failed", err);
    return { ok: false, error: "Could not update the sticker. Please try again." };
  }
}
