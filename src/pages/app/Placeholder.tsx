interface Props { title: string; subtitle?: string; }
export default function Placeholder({ title, subtitle }: Props) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      <div className="mt-8 bg-card border border-dashed border-border rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">Esta sección estará disponible en la siguiente fase.</p>
      </div>
    </div>
  );
}
