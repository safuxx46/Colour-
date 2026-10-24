import { useEffect, type ReactNode, type ButtonHTMLAttributes } from "react";
import { ArrowLeft, Inbox, LoaderCircle, X } from "lucide-react";

export function Button({ children, className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`app-button ${variant} ${className}`} {...props}>{children}</button>;
}

export function PageHeader({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="page-heading">
      <div className="page-heading-main">
        {onBack && <button className="icon-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={21} /></button>}
        <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {action}
    </header>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "live" | "success" | "warning" | "danger" | "purple" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-panel ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
        {children}
      </section>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><Inbox size={28} /><h3>{title}</h3><p>{text}</p></div>;
}

export function LoadingScreen({ label = "Loading arena" }: { label?: string }) {
  return <div className="loading-screen"><span className="loading-logo"><LoaderCircle size={28} /></span><p>{label}</p></div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Money({ amount, signed = false }: { amount: number; signed?: boolean }) {
  return <span className={signed ? (amount >= 0 ? "money-positive" : "money-negative") : ""}>{signed ? (amount > 0 ? "+₹" : amount < 0 ? "-₹" : "₹") : "₹"}{Math.abs(amount).toLocaleString("en-IN")}</span>;
}
