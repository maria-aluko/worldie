import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ----------------------------- Reference data ----------------------------- */

export const teams = pgTable("teams", {
  id: text("id").primaryKey(), // e.g. "BRA"
  name: text("name").notNull(),
  code: text("code").notNull(),
  flag: text("flag").notNull().default(""),
  group: text("group"), // "A".."L" or null (qualifier slots)
});

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(), // e.g. "M01", "R32-1"
    stage: text("stage").notNull(), // Stage
    group: text("group"),
    homeTeamId: text("home_team_id"),
    awayTeamId: text("away_team_id"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }),
    status: text("status").notNull().default("scheduled"), // MatchStatus
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    externalId: text("external_id"), // provider id for results polling
  },
  (t) => [index("matches_stage_idx").on(t.stage)],
);

/* -------------------------------- Players -------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayName: text("display_name"),
    avatarSeed: text("avatar_seed"),
    claimedEmail: text("claimed_email"),
    // Supabase Auth user id (the auth.users UUID). Set when a player links a
    // real account via "Continue with Google"; makes the account restorable on
    // any device. Null for anonymous players.
    authUserId: text("auth_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // An email / linked auth account can each belong to at most one player, so
  // they reliably restore identity on another device. Nulls repeat (most
  // players stay anonymous and never link an account).
  (t) => [
    uniqueIndex("users_email_idx").on(t.claimedEmail),
    uniqueIndex("users_auth_user_idx").on(t.authUserId),
  ],
);

/**
 * Single-use magic links that let a player adopt an existing anonymous identity
 * on a new device — no password account required.
 */
export const claimTokens = pgTable(
  "claim_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("claim_tokens_token_idx").on(t.token)],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    level: text("level").notNull(), // Level
    slug: text("slug").notNull(), // private share id
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    totalPoints: integer("total_points").notNull().default(0),
  },
  (t) => [
    uniqueIndex("entries_slug_idx").on(t.slug),
    index("entries_user_idx").on(t.userId),
    index("entries_level_idx").on(t.level),
    // One prediction per player per level — re-predicting edits this entry
    // rather than spawning duplicates, so it can be reused across many groups.
    uniqueIndex("entries_user_level_idx").on(t.userId, t.level),
  ],
);

export const entryPicks = pgTable(
  "entry_picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(), // match id or slot
    pickTeamId: text("pick_team_id"),
    predHome: integer("pred_home"),
    predAway: integer("pred_away"),
    points: integer("points").notNull().default(0),
  },
  (t) => [
    // ref can repeat per entry for multi-team advancement picks (e.g. the 4
    // teams a player sends to the semis), so uniqueness includes the team.
    uniqueIndex("entry_picks_unique").on(t.entryId, t.ref, t.pickTeamId),
    index("entry_picks_entry_idx").on(t.entryId),
    index("entry_picks_ref_idx").on(t.ref),
    index("entry_picks_team_idx").on(t.pickTeamId),
  ],
);

/* -------------------------------- Groups --------------------------------- */

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    level: text("level").notNull(), // Level — the format every member plays
    inviteSlug: text("invite_slug").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("groups_invite_idx").on(t.inviteSlug)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("group_members_unique").on(t.groupId, t.userId)],
);

/* ------------------------ Aggregation cache (compare) --------------------- */

export const pickStats = pgTable("pick_stats", {
  ref: text("ref").primaryKey(), // "champion", match id, …
  data: jsonb("data").notNull(), // { teamId: count, ... }
  total: integer("total").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------- Sticker collections -------------------------- */

/**
 * A collectible album, e.g. the Panini World Cup 2026 sticker collection. One
 * row per collection so the feature can later host other competitions.
 */
export const stickerSets = pgTable("sticker_sets", {
  id: text("id").primaryKey(), // e.g. "wc-2026"
  name: text("name").notNull(),
  season: text("season"),
  totalCount: integer("total_count").notNull().default(0),
});

/**
 * Reference checklist of stickers in a set — seeded, no copyrighted artwork.
 * `code` is the official card code printed on the sticker (e.g. "1", "FWC 5").
 */
export const stickers = pgTable(
  "stickers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: text("set_id")
      .notNull()
      .references(() => stickerSets.id, { onDelete: "cascade" }),
    code: text("code").notNull(), // official card code
    label: text("label"), // plain text name (no image)
    section: text("section").notNull(), // grouping, e.g. team name or "Tournament"
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    // Finish for Extra Stickers ("bronze"|"silver"|"gold"); the sentinel "base"
    // marks a regular (single-finish) sticker. Kept non-null so the unique index
    // below treats it as a normal key (Postgres counts NULLs as distinct, which
    // would let the seed upsert duplicate every regular sticker). The app maps
    // "base" ↔ null at the query boundary.
    tier: text("tier").notNull().default("base"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("stickers_set_code_idx").on(t.setId, t.code, t.tier),
    index("stickers_set_idx").on(t.setId),
  ],
);

/**
 * A player's status for a sticker. Sparse: a missing row means "not owned"
 * (the default), so we only store the stickers a player has interacted with.
 * `status` ∈ "owned" | "desired". `count` is the number of physical copies held
 * — ≥1 for "owned" (copies ≥2 means `count - 1` spares to swap, derived, not a
 * separate status); "desired" (wanted) rows carry 0.
 */
export const userStickers = pgTable(
  "user_stickers",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stickerId: uuid("sticker_id")
      .notNull()
      .references(() => stickers.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // StickerStatus
    count: integer("count").notNull().default(1), // copies held
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_stickers_unique").on(t.userId, t.stickerId),
    index("user_stickers_user_idx").on(t.userId),
  ],
);
