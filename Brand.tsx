import { Crosshair } from "lucide-react";

export function Brand({ compact = false, admin = false }: { compact?: boolean; admin?: boolean }) {
  return (
    <div className="brand" aria-label="FF Arena">
      <span className="brand-mark"><Crosshair size={compact ? 20 : 24} strokeWidth={2.4} /></span>
      <span className="brand-type"><strong>FF<span>//</span>ARENA</strong>{!compact && <small>{admin ? "OWNER CONSOLE" : "PLAY. FRAG. WIN."}</small>}</span>
    </div>
  );
}
