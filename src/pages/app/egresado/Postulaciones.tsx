import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { FileText, Trash2, Building2, Calendar } from "lucide-react";

interface Postulacion {
  id: string;
  estado: string;
  mensaje: string | null;
  created_at: string;
  vacantes: {
    puesto: string;
    ubicacion: string | null;
    empresas: { razon_social: string } | null;
  } | null;
}

export default function Postulaciones() {
  const { egresadoId } = useAuth();
  const [items, setItems] = useState<Postulacion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!egresadoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("postulaciones")
      .select("id, estado, mensaje, created_at, vacante_id")
      .eq("egresado_id", egresadoId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error cargando postulaciones");
      setLoading(false);
      return;
    }
    const vacIds = Array.from(new Set((data ?? []).map((p) => p.vacante_id)));
    let vacMap: Record<string, { puesto: string; ubicacion: string | null; empresa_id: string }> = {};
    let empMap: Record<string, string> = {};
    if (vacIds.length) {
      const { data: vacs } = await supabase
        .from("vacantes")
        .select("id, puesto, ubicacion, empresa_id")
        .in("id", vacIds);
      (vacs ?? []).forEach((v) => { vacMap[v.id] = v as any; });
      const empIds = Array.from(new Set((vacs ?? []).map((v) => v.empresa_id)));
      if (empIds.length) {
        const { data: emps } = await supabase
          .from("empresas")
          .select("id, razon_social")
          .in("id", empIds);
        (emps ?? []).forEach((e) => { empMap[e.id] = e.razon_social; });
      }
    }
    const enriched: Postulacion[] = (data ?? []).map((p) => {
      const v = vacMap[p.vacante_id];
      return {
        id: p.id,
        estado: p.estado,
        mensaje: p.mensaje,
        created_at: p.created_at,
        vacantes: v ? { puesto: v.puesto, ubicacion: v.ubicacion, empresas: { razon_social: empMap[v.empresa_id] ?? "—" } } : null,
      };
    });
    setItems(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [egresadoId]);

  const retirar = async (id: string) => {
    if (!confirm("¿Retirar esta postulación?")) return;
    const { error } = await supabase.from("postulaciones").delete().eq("id", id);
    if (error) return toast.error("No se pudo retirar");
    toast.success("Postulación retirada");
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <div>
      <PageHeader title="Mis postulaciones" subtitle="Sigue el estado de las vacantes a las que has postulado" />
      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 sm:p-12 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Aún no has postulado a ninguna vacante</p>
        </div>
      ) : (
        <>
          {/* Tabla — desktop */}
          <div className="hidden md:block bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs font-display text-muted-foreground uppercase">
                  <th className="px-4 py-3">Puesto</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{p.vacantes?.puesto ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.vacantes?.empresas?.razon_social ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StatusBadge estado={p.estado} /></td>
                    <td className="px-4 py-3">
                      {(p.estado === "pendiente" || p.estado === "en_revision") && (
                        <button onClick={() => retirar(p.id)} className="text-muted-foreground hover:text-destructive" title="Retirar">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas — móvil */}
          <div className="md:hidden grid gap-3">
            {items.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-semibold text-foreground text-sm leading-tight flex-1">{p.vacantes?.puesto ?? "—"}</h3>
                  <StatusBadge estado={p.estado} />
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Building2 size={12} />{p.vacantes?.empresas?.razon_social ?? "—"}</div>
                  <div className="flex items-center gap-1.5"><Calendar size={12} />{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
                {(p.estado === "pendiente" || p.estado === "en_revision") && (
                  <button
                    onClick={() => retirar(p.id)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-destructive hover:bg-destructive/10 text-xs font-display font-medium"
                  >
                    <Trash2 size={14} /> Retirar postulación
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
