import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button, Field } from "./AppUI";

export function AuthForm({ adminMode = false }: { adminMode?: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", referralCode: "" });
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const onSuccess = async () => {
    await utils.invalidate();
    navigate(adminMode ? "/admin" : "/");
  };
  const signIn = trpc.credentials.signIn.useMutation({ onSuccess, onError: (error) => toast.error(error.message) });
  const signUp = trpc.credentials.signUp.useMutation({ onSuccess: () => { toast.success("Your arena account is ready."); void onSuccess(); }, onError: (error) => toast.error(error.message) });
  const pending = signIn.isPending || signUp.isPending;
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "signup" && !adminMode) signUp.mutate({ ...form, referralCode: form.referralCode || undefined });
    else signIn.mutate({ email: form.email, password: form.password });
  }

  function fillDemo() {
    setForm((current) => ({ ...current, email: adminMode ? "owner@ffarena.app" : "demo@ffarena.app", password: adminMode ? "ArenaOwner2026!" : "Player123" }));
  }

  return (
    <div className="auth-form-wrap">
      {!adminMode && <div className="segmented auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button></div>}
      <div className="auth-form-title"><span>{adminMode ? "PRIVATE ACCESS" : mode === "signin" ? "WELCOME BACK" : "JOIN THE SQUAD"}</span><h2>{adminMode ? "Owner sign-in" : mode === "signin" ? "Enter the arena" : "Create your player ID"}</h2><p>{adminMode ? "Manage matches, payments, players and results." : "Your matches, winnings and wallet — one account."}</p></div>
      <form onSubmit={submit} className="form-stack">
        {mode === "signup" && !adminMode && <Field label="Player name"><div className="input-with-icon"><UserRound size={18} /><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" autoComplete="name" required minLength={2} /></div></Field>}
        <Field label="Email address"><div className="input-with-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="player@example.com" autoComplete="email" required /></div></Field>
        <Field label="Password" hint="Minimum 6 characters"><div className="input-with-icon"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="••••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={6} /><button type="button" className="input-action" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></Field>
        {mode === "signup" && !adminMode && <Field label="Referral code (optional)"><input value={form.referralCode} onChange={(e) => update("referralCode", e.target.value.toUpperCase())} placeholder="e.g. FFDEMO10" /></Field>}
        <Button type="submit" disabled={pending}>{pending ? "Please wait…" : adminMode ? "Unlock owner console" : mode === "signin" ? "Sign in & play" : "Create free account"}</Button>
      </form>
      <button className="demo-access" onClick={fillDemo}>Fill {adminMode ? "owner" : "player"} preview credentials</button>
      <Link className="auth-switch-link" to={adminMode ? "/" : "/admin"}>{adminMode ? "← Back to player app" : "Arena owner? Open admin app →"}</Link>
    </div>
  );
}
