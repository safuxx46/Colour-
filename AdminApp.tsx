import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BadgeIndianRupee, BarChart3, Check, ChevronRight, CircleDollarSign,
  Copy, Edit3, Gamepad2, LayoutDashboard, LockKeyhole, LogOut, Plus, Search, ShieldCheck,
  Swords, Trophy, UsersRound, WalletCards,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { Button, EmptyState, Field, LoadingScreen, Modal, PageHeader, StatusPill } from "@/components/AppUI";
import Login from "./Login";

type AdminPage = "overview" | "matches" | "requests" | "results" | "players";
const adminNav = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "matches" as const, label: "Matches", icon: Swords },
  { id: "requests" as const, label: "Requests", icon: WalletCards },
  { id: "results" as const, label: "Results", icon: Trophy },
  { id: "players" as const, label: "Players", icon: UsersRound },
];

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}

export default function AdminApp() {
  const auth = useAuth({ redirectPath: "/admin" });
  if (auth.isLoading) return <LoadingScreen label="Loading owner console" />;
  if (!auth.user) return <Login adminMode />;
  if (auth.user.role !== "admin") return <main className="access-denied"><ShieldCheck size={42} /><h1>Owner access only</h1><p>This account does not have administrator permission.</p><div><Link to="/"><Button variant="secondary"><ArrowLeft size={17} /> Player app</Button></Link><Button onClick={() => auth.logout()}>Sign out</Button></div></main>;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const [page, setPage] = useState<AdminPage>("overview");
  const auth = useAuth({ redirectPath: "/admin" });
  const navigate = (next: AdminPage) => { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div className="admin-app">
      <aside className="admin-sidebar"><Brand admin /><nav>{adminNav.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => navigate(item.id)}><item.icon size={20} /><span>{item.label}</span>{item.id === "requests" && <PendingBadge />}</button>)}</nav><div className="admin-sidebar-bottom"><Link to="/"><Gamepad2 size={19} /> Player app <ArrowUpRightIcon /></Link><button onClick={() => auth.logout()}><LogOut size={19} /> Sign out</button><div className="owner-card"><span>{auth.user?.name?.slice(0, 1)}</span><div><b>{auth.user?.name}</b><small>ARENA OWNER</small></div></div></div></aside>
      <main className="admin-main">
        <header className="admin-mobile-header"><Brand compact admin /><button className="icon-button" onClick={() => auth.logout()} aria-label="Sign out"><LogOut size={19} /></button></header>
        {page === "overview" && <AdminOverview onNavigate={navigate} />}
        {page === "matches" && <AdminMatches />}
        {page === "requests" && <AdminRequests />}
        {page === "results" && <AdminResults />}
        {page === "players" && <AdminPlayers />}
      </main>
      <nav className="bottom-nav admin-bottom-nav">{adminNav.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => navigate(item.id)}><item.icon size={20} /><span>{item.label}</span></button>)}</nav>
    </div>
  );
}

function ArrowUpRightIcon() { return <ArrowRight size={16} />; }

function PendingBadge() {
  const overview = trpc.admin.overview.useQuery();
  const count = (overview.data?.pendingDeposits ?? 0) + (overview.data?.pendingWithdrawals ?? 0);
  return count > 0 ? <i className="nav-count">{count}</i> : null;
}

function AdminOverview({ onNavigate }: { onNavigate: (page: AdminPage) => void }) {
  const overview = trpc.admin.overview.useQuery();
  const matches = trpc.admin.matches.useQuery();
  const upcoming = matches.data?.filter((match) => match.status !== "result").slice(0, 3) ?? [];
  const pending = (overview.data?.pendingDeposits ?? 0) + (overview.data?.pendingWithdrawals ?? 0);
  return (
    <div className="admin-page"><PageHeader title="Arena command center" subtitle="Live operations, payments and player activity" action={<span className="admin-date">{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short" }).format(new Date())}</span>} />
      <section className="admin-welcome"><div><span className="eyebrow"><span className="live-dot" /> SYSTEMS OPERATIONAL</span><h2>Run the arena.<br /><em>Reward the skill.</em></h2><p>{pending ? `${pending} payment request${pending > 1 ? "s" : ""} need your attention.` : "All payment queues are clear."}</p></div><Button onClick={() => onNavigate(pending ? "requests" : "matches")}>{pending ? "Review requests" : "Manage matches"}<ArrowRight size={18} /></Button><BarChart3 className="admin-welcome-icon" /></section>
      <section className="admin-stat-grid">{[
        { label: "TOTAL PLAYERS", value: overview.data?.players ?? 0, note: "Registered accounts", icon: UsersRound },
        { label: "LIVE MATCHES", value: overview.data?.live ?? 0, note: `${overview.data?.matches ?? 0} total created`, icon: Gamepad2 },
        { label: "DEPOSIT QUEUE", value: overview.data?.pendingDeposits ?? 0, note: "UTRs awaiting review", icon: BadgeIndianRupee },
        { label: "WITHDRAWAL QUEUE", value: overview.data?.pendingWithdrawals ?? 0, note: "UPI payouts to process", icon: CircleDollarSign },
      ].map((stat) => <article key={stat.label}><stat.icon size={21} /><span>{stat.label}</span><b>{stat.value}</b><small>{stat.note}</small></article>)}</section>
      <div className="admin-overview-grid"><section className="admin-section"><div className="section-heading"><div><span className="eyebrow">MATCH OPERATIONS</span><h2>Active & upcoming</h2></div><button className="text-link" onClick={() => onNavigate("matches")}>View all <ArrowRight size={15} /></button></div>{upcoming.map((match) => <button className="admin-match-row" key={match.id} onClick={() => onNavigate("matches")}><StatusPill tone={match.status === "live" ? "live" : "success"}>{match.status.toUpperCase()}</StatusPill><div><b>{match.title}</b><small>{formatTime(match.matchTime)} · {match.map}</small></div><span>{match.entries.length}/{match.totalSlots}<ChevronRight size={16} /></span></button>)}</section><section className="admin-section collection-card"><span className="eyebrow">APPROVED DEPOSITS</span><h2>₹{(overview.data?.depositValue ?? 0).toLocaleString("en-IN")}</h2><p>Total verified player deposits</p><div className="collection-bar"><i style={{ width: `${Math.min(100, (overview.data?.depositValue ?? 0) / 20)}%` }} /></div><button onClick={() => onNavigate("requests")}>Open payment center <ArrowRight size={16} /></button></section></div>
    </div>
  );
}

function AdminMatches() {
  const matches = trpc.admin.matches.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "result">("all");
  const filtered = matches.data?.filter((match) => filter === "all" || match.status === filter) ?? [];
  return (
    <div className="admin-page"><PageHeader title="Match management" subtitle="Create rooms, set rewards and control access" action={<Button onClick={() => setCreateOpen(true)}><Plus size={18} /> Create match</Button>} />
      <div className="admin-toolbar"><div className="match-tabs">{(["all", "live", "upcoming", "result"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><span>{filtered.length} matches</span></div>
      <div className="admin-match-list">{filtered.map((match) => <article className="admin-match-card" key={match.id}><div className="admin-match-card-top"><StatusPill tone={match.status === "live" ? "live" : match.status === "upcoming" ? "success" : "neutral"}>{match.status.toUpperCase()}</StatusPill><span>#{String(match.id).padStart(4, "0")}</span></div><h3>{match.title}</h3><p>{formatTime(match.matchTime)}</p><div className="match-tags"><span>{match.type}</span><span>{match.version}</span><span>{match.map}</span></div><div className="admin-match-data"><div><small>ENTRY</small><b>₹{match.entryFee}</b></div><div><small>PER KILL</small><b className="lime">₹{match.perKillPrize}</b></div><div><small>PLAYERS</small><b>{match.entries.length}/{match.totalSlots}</b></div></div><div className="admin-room-state"><LockKeyhole size={16} /><span>{match.roomId ? `Room ${match.roomId} configured` : "Room credentials not set"}</span></div><Button variant="secondary" className="full-width" onClick={() => setEditId(match.id)}><Edit3 size={16} /> Edit match & room</Button></article>)}</div>
      {filtered.length === 0 && !matches.isLoading && <EmptyState title="No matches in this view" text="Create a match or choose another status filter." />}
      <MatchForm open={createOpen} onClose={() => setCreateOpen(false)} />
      <MatchForm open={editId !== null} matchId={editId} onClose={() => setEditId(null)} />
    </div>
  );
}

function MatchForm({ open, matchId = null, onClose }: { open: boolean; matchId?: number | null; onClose: () => void }) {
  const matches = trpc.admin.matches.useQuery(undefined, { enabled: open && matchId !== null });
  const existing = matches.data?.find((match) => match.id === matchId);
  const [form, setForm] = useState({ title: "", entryFee: "25", perKillPrize: "20", matchTime: "", type: "Solo" as "Solo" | "Duo" | "Squad", version: "TPP" as "TPP" | "FPP", map: "Bermuda", totalSlots: "48", status: "upcoming" as "upcoming" | "live" | "result", roomId: "", roomPassword: "" });
  useEffect(() => {
    if (existing) setForm({ title: existing.title, entryFee: String(existing.entryFee), perKillPrize: String(existing.perKillPrize), matchTime: new Date(existing.matchTime.getTime() - existing.matchTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16), type: existing.type, version: existing.version, map: existing.map, totalSlots: String(existing.totalSlots), status: existing.status, roomId: existing.roomId ?? "", roomPassword: existing.roomPassword ?? "" });
    else if (!matchId) setForm((current) => ({ ...current, title: "", matchTime: "", roomId: "", roomPassword: "" }));
  }, [existing, matchId]);
  const utils = trpc.useUtils();
  const success = async (message: string) => { toast.success(message); await utils.invalidate(); onClose(); };
  const create = trpc.admin.createMatch.useMutation({ onSuccess: () => success("Match created."), onError: (error) => toast.error(error.message) });
  const update = trpc.admin.updateMatch.useMutation({ onSuccess: () => success("Match updated."), onError: (error) => toast.error(error.message) });
  const room = trpc.admin.updateRoom.useMutation({ onSuccess: async () => { toast.success("Room credentials saved."); await utils.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const pending = create.isPending || update.isPending;
  const values = { title: form.title, entryFee: Number(form.entryFee), perKillPrize: Number(form.perKillPrize), matchTime: new Date(form.matchTime), type: form.type, version: form.version, map: form.map, totalSlots: Number(form.totalSlots) };
  return <Modal open={open} onClose={onClose} title={matchId ? `Edit match #${matchId}` : "Create a new match"} wide><form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (matchId) update.mutate({ ...values, id: matchId, status: form.status }); else create.mutate(values); }}><Field label="Match title"><input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="e.g. Bermuda Per Kill Clash" required minLength={3} /></Field><div className="form-three"><Field label="Entry fee ₹"><input type="number" min="0" value={form.entryFee} onChange={(e) => updateField("entryFee", e.target.value)} required /></Field><Field label="Per kill ₹"><input type="number" min="0" value={form.perKillPrize} onChange={(e) => updateField("perKillPrize", e.target.value)} required /></Field><Field label="Total slots"><input type="number" min="2" max="48" value={form.totalSlots} onChange={(e) => updateField("totalSlots", e.target.value)} required /></Field></div><Field label="Match time"><input type="datetime-local" value={form.matchTime} onChange={(e) => updateField("matchTime", e.target.value)} required /></Field><div className="form-three"><Field label="Type"><select value={form.type} onChange={(e) => updateField("type", e.target.value)}><option>Solo</option><option>Duo</option><option>Squad</option></select></Field><Field label="Version"><select value={form.version} onChange={(e) => updateField("version", e.target.value)}><option>TPP</option><option>FPP</option></select></Field><Field label="Map"><input value={form.map} onChange={(e) => updateField("map", e.target.value)} required /></Field></div>{matchId && <Field label="Match status"><select value={form.status} onChange={(e) => updateField("status", e.target.value)}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="result">Result</option></select></Field>}<Button type="submit" disabled={pending}>{pending ? "Saving…" : matchId ? "Save match changes" : "Create match"}</Button></form>{matchId && <form className="room-edit-form" onSubmit={(event) => { event.preventDefault(); room.mutate({ id: matchId, roomId: form.roomId, roomPassword: form.roomPassword }); }}><div><span className="eyebrow">PRIVATE ROOM ACCESS</span><h3>Joined players only</h3></div><div className="form-two"><Field label="Room ID"><input value={form.roomId} onChange={(e) => updateField("roomId", e.target.value)} placeholder="Enter custom room ID" /></Field><Field label="Password"><input value={form.roomPassword} onChange={(e) => updateField("roomPassword", e.target.value)} placeholder="Enter room password" /></Field></div><Button type="submit" variant="secondary" disabled={room.isPending}>{room.isPending ? "Saving…" : "Save room credentials"}</Button></form>}</Modal>;
}

function AdminRequests() {
  const [tab, setTab] = useState<"deposits" | "withdrawals">("deposits");
  const deposits = trpc.admin.deposits.useQuery();
  const withdrawals = trpc.admin.withdrawals.useQuery();
  const utils = trpc.useUtils();
  const reviewed = async (message: string) => { toast.success(message); await utils.invalidate(); };
  const reviewDeposit = trpc.admin.reviewDeposit.useMutation({ onSuccess: () => reviewed("Deposit request updated."), onError: (error) => toast.error(error.message) });
  const reviewWithdrawal = trpc.admin.reviewWithdrawal.useMutation({ onSuccess: () => reviewed("Withdrawal request updated."), onError: (error) => toast.error(error.message) });
  const pendingDeposits = deposits.data?.filter((row) => row.deposit.status === "pending").length ?? 0;
  const pendingWithdrawals = withdrawals.data?.filter((row) => row.withdrawal.status === "pending").length ?? 0;
  return <div className="admin-page"><PageHeader title="Payment center" subtitle="Verify UPI deposits and process manual payouts" action={<span className="secure-label"><ShieldCheck size={15} /> MANUAL REVIEW</span>} /><div className="match-tabs request-tabs"><button className={tab === "deposits" ? "active" : ""} onClick={() => setTab("deposits")}>Deposits <span>{pendingDeposits}</span></button><button className={tab === "withdrawals" ? "active" : ""} onClick={() => setTab("withdrawals")}>Withdrawals <span>{pendingWithdrawals}</span></button></div><div className="payment-request-list">{tab === "deposits" && deposits.data?.map((row) => <article className="payment-request" key={row.deposit.id}><div className="payment-request-head"><div><span className="avatar-small">{row.playerName?.slice(0, 1)}</span><div><b>{row.playerName}</b><small>{row.playerEmail}</small></div></div><strong>₹{row.deposit.amount}</strong></div><div className="utr-row"><span>UTR NUMBER</span><b>{row.deposit.utr}</b><button onClick={() => { void navigator.clipboard.writeText(row.deposit.utr); toast.success("UTR copied"); }} aria-label="Copy UTR"><Copy size={16} /></button></div><div className="request-meta"><span>{formatTime(row.deposit.createdAt)}</span><StatusPill tone={row.deposit.status === "approved" ? "success" : row.deposit.status === "rejected" ? "danger" : "warning"}>{row.deposit.status.toUpperCase()}</StatusPill></div>{row.deposit.status === "pending" && <div className="request-actions"><Button variant="secondary" onClick={() => reviewDeposit.mutate({ id: row.deposit.id, decision: "rejected" })} disabled={reviewDeposit.isPending}>Reject</Button><Button onClick={() => reviewDeposit.mutate({ id: row.deposit.id, decision: "approved" })} disabled={reviewDeposit.isPending}><Check size={17} /> Verify & credit</Button></div>}</article>)}{tab === "withdrawals" && withdrawals.data?.map((row) => <article className="payment-request" key={row.withdrawal.id}><div className="payment-request-head"><div><span className="avatar-small">{row.playerName?.slice(0, 1)}</span><div><b>{row.playerName}</b><small>{row.playerEmail}</small></div></div><strong>₹{row.withdrawal.amount}</strong></div><div className="utr-row"><span>PLAYER UPI ID</span><b>{row.withdrawal.upiId}</b><button onClick={() => { void navigator.clipboard.writeText(row.withdrawal.upiId); toast.success("UPI ID copied"); }} aria-label="Copy UPI ID"><Copy size={16} /></button></div><div className="request-meta"><span>{formatTime(row.withdrawal.createdAt)}</span><StatusPill tone={row.withdrawal.status === "paid" ? "success" : row.withdrawal.status === "rejected" ? "danger" : "warning"}>{row.withdrawal.status.toUpperCase()}</StatusPill></div>{row.withdrawal.status === "pending" && <div className="request-actions"><Button variant="secondary" onClick={() => reviewWithdrawal.mutate({ id: row.withdrawal.id, decision: "rejected" })} disabled={reviewWithdrawal.isPending}>Reject & refund</Button><Button onClick={() => reviewWithdrawal.mutate({ id: row.withdrawal.id, decision: "paid" })} disabled={reviewWithdrawal.isPending}><Check size={17} /> Mark as paid</Button></div>}</article>)}{((tab === "deposits" && deposits.data?.length === 0) || (tab === "withdrawals" && withdrawals.data?.length === 0)) && <EmptyState title={`No ${tab}`} text="Player requests will appear here." />}</div></div>;
}

function AdminResults() {
  const matches = trpc.admin.matches.useQuery();
  const eligible = matches.data?.filter((match) => match.entries.length > 0) ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [kills, setKills] = useState<Record<number, string>>({});
  const selected = eligible.find((match) => match.id === selectedId) ?? eligible[0];
  useEffect(() => { if (selected) setKills(Object.fromEntries(selected.entries.map((row) => [row.entry.id, String(row.entry.kills)]))); }, [selected?.id]);
  const utils = trpc.useUtils();
  const save = trpc.admin.saveResults.useMutation({ onSuccess: async () => { toast.success("Results saved. Winnings credited."); await utils.invalidate(); }, onError: (error) => toast.error(error.message) });
  return <div className="admin-page"><PageHeader title="Results & winnings" subtitle="Enter kills — per-kill winnings calculate automatically" />{eligible.length === 0 && !matches.isLoading ? <EmptyState title="No joined matches yet" text="Once players join a match, you can enter results here." /> : <><div className="result-match-selector">{eligible.map((match) => <button key={match.id} className={selected?.id === match.id ? "active" : ""} onClick={() => setSelectedId(match.id)}><span>#{match.id}</span><b>{match.title}</b><small>{match.status.toUpperCase()} · {match.entries.length} players</small></button>)}</div>{selected && <section className="result-editor"><div className="result-editor-head"><div><span className="eyebrow">EDITING MATCH #{selected.id}</span><h2>{selected.title}</h2><p>₹{selected.perKillPrize} per kill · winnings credit on save</p></div><StatusPill tone="purple">{selected.type} · {selected.map}</StatusPill></div><div className="result-table"><div className="result-table-head"><span>SLOT / PLAYER</span><span>KILLS</span><span>WINNINGS</span></div>{selected.entries.map((row) => <div className="result-edit-row" key={row.entry.id}><div><span className="participant-slot">{row.entry.slot}</span><p><b>{row.entry.ign}</b><small>{row.playerName}</small></p></div><input aria-label={`Kills for ${row.entry.ign}`} type="number" min="0" max="100" value={kills[row.entry.id] ?? "0"} onChange={(event) => setKills((current) => ({ ...current, [row.entry.id]: event.target.value }))} /><strong>₹{Number(kills[row.entry.id] ?? 0) * selected.perKillPrize}</strong></div>)}</div><Button className="save-results" disabled={save.isPending} onClick={() => save.mutate({ matchId: selected.id, results: selected.entries.map((row) => ({ entryId: row.entry.id, kills: Number(kills[row.entry.id] ?? 0) })) })}>{save.isPending ? "Saving & crediting…" : "Publish results & credit winnings"}<Trophy size={18} /></Button><p className="form-footnote"><ShieldCheck size={14} /> Editing a published result only credits or debits the difference.</p></section>}</>}</div>;
}

function AdminPlayers() {
  const players = trpc.admin.players.useQuery();
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const toggle = trpc.admin.togglePlayerBlock.useMutation({ onSuccess: async () => { toast.success("Player access updated."); await utils.invalidate(); }, onError: (error) => toast.error(error.message) });
  const filtered = useMemo(() => players.data?.filter((player) => `${player.name} ${player.email}`.toLowerCase().includes(search.toLowerCase())) ?? [], [players.data, search]);
  return <div className="admin-page"><PageHeader title="Player management" subtitle="Wallet balances, match history and account access" /><div className="player-search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" /><span>{filtered.length} players</span></div><div className="player-table"><div className="player-table-head"><span>PLAYER</span><span>WALLET</span><span>ACTIVITY</span><span>STATUS</span><span>ACTION</span></div>{filtered.map((player) => <div className="player-table-row" key={player.id}><div className="player-cell"><span className="avatar-small">{player.name?.slice(0, 1)}</span><p><b>{player.name}</b><small>{player.email}</small></p></div><strong>₹{player.walletBalance}</strong><span>{player.matchesPlayed} matches · {player.totalKills} kills</span><StatusPill tone={player.blocked ? "danger" : "success"}>{player.blocked ? "BLOCKED" : player.role === "admin" ? "OWNER" : "ACTIVE"}</StatusPill>{player.role === "admin" ? <span className="owner-lock"><ShieldCheck size={17} /></span> : <Button variant={player.blocked ? "secondary" : "ghost"} onClick={() => toggle.mutate({ id: player.id, blocked: !player.blocked })} disabled={toggle.isPending}>{player.blocked ? "Unblock" : "Block"}</Button>}</div>)}{filtered.length === 0 && !players.isLoading && <EmptyState title="No players found" text="Try a different name or email search." />}</div></div>;
}
