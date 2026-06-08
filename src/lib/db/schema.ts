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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // An email can belong to at most one player, so it reliably restores identity
  // on another device. Nulls are allowed to repeat (most players never claim).
  (t) => [uniqueIndex("users_email_idx").on(t.claimedEmail)],
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
