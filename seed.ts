import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { deposits, matchEntries, matches, users, walletTransactions, withdrawals } from "./schema";
import { hashPassword } from "../api/password";

async function seed() {
  const db = getDb();
  console.log("Seeding FF Arena preview data...");
  const existingMatches = await db.select({ id: matches.id }).from(matches).limit(1);
  if (existingMatches.length) {
    console.log("Preview data already exists; no changes made.");
    process.exit(0);
  }

  const passwordHash = hashPassword("Player123");
  const demoInsert = await db.insert(users).values({
    unionId: "credentials:demo@ffarena.app",
    name: "Safwan",
    email: "demo@ffarena.app",
    passwordHash,
    walletBalance: 260,
    referralCode: "FFDEMO10",
    firstDepositApproved: true,
    lastSignInAt: new Date(),
  }).$returningId();
  const raviInsert = await db.insert(users).values({
    unionId: "credentials:ravi@ffarena.app",
    name: "Ravi Kumar",
    email: "ravi@ffarena.app",
    passwordHash,
    walletBalance: 90,
    referralCode: "FFRAVI20",
    referredBy: demoInsert[0].id,
    lastSignInAt: new Date(),
  }).$returningId();
  const demoId = demoInsert[0].id;
  const raviId = raviInsert[0].id;

  const now = Date.now();
  const inserted = await db.insert(matches).values([
    { title: "BR Per Kill · Bermuda Clash", entryFee: 25, perKillPrize: 20, matchTime: new Date(now + 2 * 3600000), type: "Solo", version: "TPP", map: "Bermuda", totalSlots: 48, status: "upcoming" },
    { title: "Lone Wolf · Purgatory Rush", entryFee: 40, perKillPrize: 25, matchTime: new Date(now + 5 * 3600000), type: "Solo", version: "FPP", map: "Purgatory", totalSlots: 48, status: "upcoming" },
    { title: "Friday Frag League", entryFee: 30, perKillPrize: 15, matchTime: new Date(now - 3600000), type: "Squad", version: "TPP", map: "Alpine", totalSlots: 48, status: "live", roomId: "68421937", roomPassword: "FF2026" },
    { title: "Bermuda Blitz · Evening", entryFee: 20, perKillPrize: 20, matchTime: new Date(now - 86400000), type: "Solo", version: "TPP", map: "Bermuda", totalSlots: 48, status: "result" },
  ]).$returningId();
  const [upcoming, , live, result] = inserted.map((row) => row.id);
  await db.insert(matchEntries).values([
    { matchId: live, userId: demoId, slot: 12, ign: "SAFWANツOP" },
    { matchId: result, userId: demoId, slot: 7, ign: "SAFWANツOP", kills: 8, winnings: 160 },
    { matchId: result, userId: raviId, slot: 9, ign: "RAVI×GAMER", kills: 5, winnings: 100 },
    { matchId: upcoming, userId: raviId, slot: 4, ign: "RAVI×GAMER" },
  ]);
  await db.insert(deposits).values([
    { userId: demoId, amount: 200, utr: "612345678901", status: "approved", reviewedAt: new Date() },
    { userId: raviId, amount: 100, utr: "623456789012", status: "pending" },
  ]);
  await db.insert(withdrawals).values({ userId: raviId, amount: 110, upiId: "ravi@upi", status: "pending" });
  await db.insert(walletTransactions).values([
    { userId: demoId, amount: 200, type: "deposit", note: "UPI deposit · UTR 612345678901" },
    { userId: demoId, amount: 160, type: "winning", note: "Bermuda Blitz · 8 kills × ₹20" },
    { userId: demoId, amount: -30, type: "entry", note: "Friday Frag League · Slot 12" },
    { userId: demoId, amount: 10, type: "referral", note: "Referral reward · Ravi Kumar's first deposit" },
  ]);
  console.log("Done. Player: demo@ffarena.app / Player123");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
