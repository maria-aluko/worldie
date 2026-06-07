import { customAlphabet } from "nanoid";

// URL-friendly, unambiguous alphabet (no 0/O/1/l).
const nano = customAlphabet("23456789abcdefghijkmnpqrstuvwxyz", 10);

/** Private, hard-to-guess share id for an entry. */
export const entrySlug = () => nano();

/** Shorter, friendlier invite code for groups. */
const inviteNano = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);
export const inviteSlug = () => inviteNano();

/** Long, unguessable single-use token for cross-device identity claim links. */
const claimNano = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  32,
);
export const claimToken = () => claimNano();
