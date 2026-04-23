import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";

interface Stats {
  totalEgresados: number; egresadosAprobados: number;
  totalEmpresas: number; empresasAprobadas: number;
  vacantesActivas: number; vacantesTotal: number;
  postulacionesTotal: number; contratados: number;
  porEstadoPost: Record<string, number>;
  topEmpresas: { razon_social: string; vacantes: number }[];
}

export default function Reportes() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [eg, egA, em, emA, vacA, vacT, postT, contr, postAll, vacEmp] = await Promise.all([
        supabase.from("egresados").select("id", { count: "exact", head: true }),
        supabase.from("egresados").select("id", { count: "exact", head: true }).eq("estado", "aprobado"),
        supabase.from("empresas").select("id", { count: "exact", head: true }),
        supabase.from("empresas").select("id", { count: "exact", head: true }).eq("estado", "aprobado"),
        supabase.from("vacantes").select("id", { count: "exact", head: true }).eq("estado", "activa"),
        supabase.from("vacantes").select("id", { count: "exact", head: true }),
        supabase.from("postulaciones").select("id", { count: "exact", head: true }),
        supabase.from("postulaciones").select("id", { count: "exact", head: true }).eq("estado", "contratado"),
        supabase.from("postulaciones").select("estado"),
        supabase.from("vacantes").select("empresa_id, empresas(razon_social)"),
      ]);
      const porEstado: Record<string, number> = {};
      (postAll.data ?? []).forEach((p: any) => { porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1; });
      const empCount: Record<string, { razon_social: string; vacantes: number }> = {};
      (vacEmp.data ?? []).forEach((v: any) => {
        const k = v.empresa_id;
        if (!empCount[k]) empCount[k] = { razon_social: v.empresas?.razon_social ?? "—", vacantes: 0 };
        empCount[k].vacantes++;
      });
      const top = Object.values(empCount).sort((a, b) => b.vacantes - a.vacantes).slice(0, 5);
      setS({
        totalEgresados: eg.count ?? 0, egresadosAprobados: egA.count ?? 0,
        totalEmpresas: em.count ?? 0, empresasAprobadas: emA.count ?? 0,
        vacantesActivas: vacA.count ?? 0, vacantesTotal: vacT.count ?? 0,
        postulacionesTotal: postT.count ?? 0, contratados: contr.count ?? 0,
        porEstadoPost: porEstado, topEmpresas: top,
      });
    })();
  }, []);

  if (!s) return <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>;

  const Cell = ({ label, value, sub }: { label: string; value: number | string; sub?: string }) => (
    <div className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="text-xs text-muted-foreground font-display mb-1.5">{label}</div>
      <div className="font-display text-3xl font-semibold text-primary">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );

  return (
    <div>
      <PageHeader title="Reportes y estadísticas" subtitle="Visión general de la Bolsa de Trabajo" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Cell label="Egresados" value={s.totalEgresados} sub={`${s.egresadosAprobados} aprobados`} />
        <Cell label="Empresas" value={s.totalEmpresas} sub={`${s.empresasAprobadas} verificadas`} />
        <Cell label="Vacantes activas" value={s.vacantesActivas} sub={`${s.vacantesTotal} totales`} />
        <Cell label="Contratados" value={s.contratados} sub={`${s.postulacionesTotal} postulaciones`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h3 className="font-display font-semibold mb-3">Postulaciones por estado</h3>
          <div className="space-y-2">
            {Object.entries(s.porEstadoPost).map(([k, v]) => {
              const pct = s.postulacionesTotal ? (v / s.postulacionesTotal) * 100 : 0;
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs font-display mb-1">
                    <span className="capitalize text-foreground">{k.replace("_", " ")}</span>
                    <span className="text-muted-foreground">{v} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            {Object.keys(s.porEstadoPost).length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <h3 className="font-display font-semibold mb-3">Top empresas por vacantes</h3>
          <div className="space-y-2">
            {s.topEmpresas.map((e) => (
              <div key={e.razon_social} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span>{e.razon_social}</span>
                <span className="font-display font-semibold text-primary">{e.vacantes}</span>
              </div>
            ))}
            {s.topEmpresas.length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
