import { and, asc, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { deposits, matchEntries, matches, users, walletTransactions, withdrawals } from "@db/schema";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";

const matchInput = z.object({
  title: z.string().trim().min(3).max(160),
  entryFee: z.number().int().min(0).max(100000),
  perKillPrize: z.number().int().min(0).max(100000),
  matchTime: z.date(),
  type: z.enum(["Solo", "Duo", "Squad"]),
  version: z.enum(["TPP", "FPP"]),
  map: z.string().trim().min(2).max(80),
  totalSlots: z.number().int().min(2).max(48),
});

export const adminRouter = createRouter({
  overview: adminQuery.query(async () => {
    const db = getDb();
    const [allUsers, allMatches, allDeposits, allWithdrawals] = await Promise.all([
      db.select().from(users), db.select().from(matches), db.select().from(deposits), db.select().from(withdrawals),
    ]);
    return {
      players: allUsers.filter((user) => user.role === "user").length,
      matches: allMatches.length,
      live: allMatches.filter((match) => match.status === "live").length,
      pendingDeposits: allDeposits.filter((item) => item.status === "pending").length,
      pendingWithdrawals: allWithdrawals.filter((item) => item.status === "pending").length,
      depositValue: allDeposits.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0),
    };
  }),

  matches: adminQuery.query(async () => {
    const db = getDb();
    const allMatches = await db.select().from(matches).orderBy(desc(matches.matchTime));
    const entries = await db.select({ entry: matchEntries, playerName: users.name, playerEmail: users.email }).from(matchEntries).leftJoin(users, eq(matchEntries.userId, users.id)).orderBy(asc(matchEntries.slot));
    return allMatches.map((match) => ({ ...match, entries: entries.filter((row) => row.entry.matchId === match.id) }));
  }),

  createMatch: adminQuery.input(matchInput).mutation(async ({ input }) => {
    const result = await getDb().insert(matches).values(input).$returningId();
    return { id: result[0].id };
  }),

  updateMatch: adminQuery.input(matchInput.extend({ id: z.number().int().positive(), status: z.enum(["live", "upcoming", "result"]) })).mutation(async ({ input }) => {
    const { id, ...values } = input;
    await getDb().update(matches).set(values).where(eq(matches.id, id));
    return { success: true };
  }),

  updateRoom: adminQuery.input(z.object({ id: z.number().int().positive(), roomId: z.string().trim().max(80), roomPassword: z.string().trim().max(80) })).mutation(async ({ input }) => {
    await getDb().update(matches).set({ roomId: input.roomId, roomPassword: input.roomPassword }).where(eq(matches.id, input.id));
    return { success: true };
  }),

  deposits: adminQuery.query(async () => {
    return getDb().select({ deposit: deposits, playerName: users.name, playerEmail: users.email }).from(deposits).leftJoin(users, eq(deposits.userId, users.id)).orderBy(desc(deposits.createdAt));
  }),

  reviewDeposit: adminQuery.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) })).mutation(async ({ input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const deposit = (await tx.select().from(deposits).where(eq(deposits.id, input.id)).limit(1))[0];
      if (!deposit || deposit.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "This request was already reviewed." });
      await tx.update(deposits).set({ status: input.decision, reviewedAt: new Date() }).where(eq(deposits.id, input.id));
      if (input.decision === "approved") {
        await tx.update(users).set({ walletBalance: sql`${users.walletBalance} + ${deposit.amount}` }).where(eq(users.id, deposit.userId));
        await tx.insert(walletTransactions).values({ userId: deposit.userId, amount: deposit.amount, type: "deposit", note: `UPI deposit · UTR ${deposit.utr}` });
        const player = (await tx.select().from(users).where(eq(users.id, deposit.userId)).limit(1))[0];
        if (player && !player.firstDepositApproved && deposit.amount >= 30) {
          await tx.update(users).set({ firstDepositApproved: true }).where(eq(users.id, player.id));
          if (player.referredBy && !player.referralBonusPaid) {
            await tx.update(users).set({ walletBalance: sql`${users.walletBalance} + 10` }).where(eq(users.id, player.referredBy));
            await tx.update(users).set({ referralBonusPaid: true }).where(eq(users.id, player.id));
            await tx.insert(walletTransactions).values({ userId: player.referredBy, amount: 10, type: "referral", note: `Referral reward · ${player.name || "New player"}'s first deposit` });
          }
        }
      }
      return { success: true };
    });
  }),

  withdrawals: adminQuery.query(async () => {
    return getDb().select({ withdrawal: withdrawals, playerName: users.name, playerEmail: users.email }).from(withdrawals).leftJoin(users, eq(withdrawals.userId, users.id)).orderBy(desc(withdrawals.createdAt));
  }),

  reviewWithdrawal: adminQuery.input(z.object({ id: z.number().int().positive(), decision: z.enum(["paid", "rejected"]) })).mutation(async ({ input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const withdrawal = (await tx.select().from(withdrawals).where(eq(withdrawals.id, input.id)).limit(1))[0];
      if (!withdrawal || withdrawal.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "This request was already reviewed." });
      await tx.update(withdrawals).set({ status: input.decision, reviewedAt: new Date() }).where(eq(withdrawals.id, input.id));
      if (input.decision === "rejected") {
        await tx.update(users).set({ walletBalance: sql`${users.walletBalance} + ${withdrawal.amount}` }).where(eq(users.id, withdrawal.userId));
        await tx.insert(walletTransactions).values({ userId: withdrawal.userId, amount: withdrawal.amount, type: "refund", note: "Withdrawal rejected · amount refunded" });
      }
      return { success: true };
    });
  }),

  saveResults: adminQuery.input(z.object({
    matchId: z.number().int().positive(),
    results: z.array(z.object({ entryId: z.number().int().positive(), kills: z.number().int().min(0).max(100) })).min(1),
  })).mutation(async ({ input }) => {
    const db = getDb();
    return db.transaction(async (tx) => {
      const match = (await tx.select().from(matches).where(eq(matches.id, input.matchId)).limit(1))[0];
      if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "Match not found." });
      for (const result of input.results) {
        const entry = (await tx.select().from(matchEntries).where(and(eq(matchEntries.id, result.entryId), eq(matchEntries.matchId, input.matchId))).limit(1))[0];
        if (!entry) throw new TRPCError({ code: "BAD_REQUEST", message: "A player entry does not belong to this match." });
        const winnings = result.kills * match.perKillPrize;
        const delta = winnings - entry.winnings;
        await tx.update(matchEntries).set({ kills: result.kills, winnings }).where(eq(matchEntries.id, entry.id));
        if (delta !== 0) {
          await tx.update(users).set({ walletBalance: sql`${users.walletBalance} + ${delta}` }).where(eq(users.id, entry.userId));
          await tx.insert(walletTransactions).values({ userId: entry.userId, amount: delta, type: "winning", note: `${match.title} · ${result.kills} kills × ₹${match.perKillPrize}${delta < 0 ? " · correction" : ""}` });
        }
      }
      await tx.update(matches).set({ status: "result" }).where(eq(matches.id, input.matchId));
      return { success: true };
    });
  }),

  players: adminQuery.query(async () => {
    const db = getDb();
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, walletBalance: users.walletBalance, blocked: users.blocked, referralCode: users.referralCode, createdAt: users.createdAt, role: users.role }).from(users).orderBy(desc(users.createdAt));
    const entries = await db.select().from(matchEntries);
    return allUsers.map((user) => ({ ...user, matchesPlayed: entries.filter((entry) => entry.userId === user.id).length, totalKills: entries.filter((entry) => entry.userId === user.id).reduce((sum, entry) => sum + entry.kills, 0) }));
  }),

  togglePlayerBlock: adminQuery.input(z.object({ id: z.number().int().positive(), blocked: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot block your own account." });
    await getDb().update(users).set({ blocked: input.blocked }).where(eq(users.id, input.id));
    return { success: true };
  }),
});
