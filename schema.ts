import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: serial("id").primaryKey(),
    unionId: varchar("unionId", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 320 }),
    avatar: text("avatar"),
    passwordHash: text("passwordHash"),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    walletBalance: int("walletBalance").default(0).notNull(),
    referralCode: varchar("referralCode", { length: 24 }).unique(),
    referredBy: bigint("referredBy", { mode: "number", unsigned: true }),
    firstDepositApproved: boolean("firstDepositApproved").default(false).notNull(),
    referralBonusPaid: boolean("referralBonusPaid").default(false).notNull(),
    blocked: boolean("blocked").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const matches = mysqlTable("matches", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  entryFee: int("entryFee").default(0).notNull(),
  perKillPrize: int("perKillPrize").default(0).notNull(),
  matchTime: timestamp("matchTime").notNull(),
  type: mysqlEnum("type", ["Solo", "Duo", "Squad"]).default("Solo").notNull(),
  version: mysqlEnum("version", ["TPP", "FPP"]).default("TPP").notNull(),
  map: varchar("map", { length: 80 }).notNull(),
  totalSlots: int("totalSlots").default(48).notNull(),
  status: mysqlEnum("status", ["live", "upcoming", "result"]).default("upcoming").notNull(),
  roomId: varchar("roomId", { length: 80 }),
  roomPassword: varchar("roomPassword", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const matchEntries = mysqlTable(
  "match_entries",
  {
    id: serial("id").primaryKey(),
    matchId: bigint("matchId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    slot: int("slot").notNull(),
    ign: varchar("ign", { length: 80 }).notNull(),
    kills: int("kills").default(0).notNull(),
    winnings: int("winnings").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("entries_match_slot_unique").on(table.matchId, table.slot),
    uniqueIndex("entries_match_user_unique").on(table.matchId, table.userId),
    index("entries_user_idx").on(table.userId),
  ],
);

export const deposits = mysqlTable(
  "deposits",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    amount: int("amount").notNull(),
    utr: varchar("utr", { length: 80 }).notNull().unique(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  (table) => [index("deposits_user_idx").on(table.userId)],
);

export const withdrawals = mysqlTable(
  "withdrawals",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    amount: int("amount").notNull(),
    upiId: varchar("upiId", { length: 160 }).notNull(),
    status: mysqlEnum("status", ["pending", "paid", "rejected"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  (table) => [index("withdrawals_user_idx").on(table.userId)],
);

export const walletTransactions = mysqlTable(
  "wallet_transactions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    amount: int("amount").notNull(),
    type: mysqlEnum("type", ["deposit", "withdrawal", "entry", "winning", "referral", "refund"]).notNull(),
    note: varchar("note", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("transactions_user_idx").on(table.userId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type MatchEntry = typeof matchEntries.$inferSelect;
export type Deposit = typeof deposits.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
