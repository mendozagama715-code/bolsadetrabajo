interface Props {
  estado: string;
  className?: string;
}

const MAP: Record<string, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-warning/15 text-warning-foreground border border-warning/30" },
  aprobado: { label: "Aprobado", cls: "bg-success/15 text-success border border-success/30" },
  rechazado: { label: "Rechazado", cls: "bg-destructive/15 text-destructive border border-destructive/30" },
  activa: { label: "Activa", cls: "bg-success/15 text-success border border-success/30" },
  cerrada: { label: "Cerrada", cls: "bg-muted text-muted-foreground border border-border" },
  en_revision: { label: "En revisión", cls: "bg-info/15 text-info border border-info/30" },
  entrevista: { label: "Entrevista", cls: "bg-primary/10 text-primary border border-primary/30" },
  contratado: { label: "Contratado", cls: "bg-success/15 text-success border border-success/30" },
};

export function StatusBadge({ estado, className = "" }: Props) {
  const m = MAP[estado] ?? { label: estado, cls: "bg-muted text-muted-foreground border border-border" };
  return <span className={`badge-pill ${m.cls} ${className}`}>{m.label}</span>;
}
