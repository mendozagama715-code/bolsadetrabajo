import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Plus, Briefcase, Eye, Trash2, MapPin, Users as UsersIcon } from "lucide-react";

interface Vacante {
  id: string;
  puesto: string;
  estado: string;
  ubicacion: string | null;
  tipo_contrato: string;
  fecha_cierre: string | null;
  created_at: string;
}

export default function MisVacantes() {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<(Vacante & { postulantes: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data: vac } = await supabase.from("vacantes").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false });
    const ids = (vac ?? []).map((v) => v.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: posts } = await supabase.from("postulaciones").select("vacante_id").in("vacante_id", ids);
      (posts ?? []).forEach((p) => { counts[p.vacante_id] = (counts[p.vacante_id] ?? 0) + 1; });
    }
    setItems((vac ?? []).map((v) => ({ ...v, postulantes: counts[v.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId]);

  const toggle = async (v: Vacante) => {
    const nuevo = v.estado === "activa" ? "cerrada" : "activa";
    const { error } = await supabase.from("vacantes").update({ estado: nuevo }).eq("id", v.id);
    if (error) return toast.error("Error");
    toast.success(`Vacante ${nuevo}`);
    load();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar vacante? Se borrarán también las postulaciones.")) return;
    const { error } = await supabase.from("vacantes").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Vacante eliminada");
    load();
  };

  return (
    <div>
      <PageHeader
        title="Mis vacantes"
        subtitle="Gestiona las vacantes publicadas por tu empresa"
        actions={
          <Link to="/app/publicar" className="inline-flex items-center gap-2 px-3 sm:px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 whitespace-nowrap">
            <Plus size={16} /><span className="hidden sm:inline">Publicar nueva</span><span className="sm:hidden">Nueva</span>
          </Link>
        }
      />

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-8 sm:p-12 text-center">
          <Briefcase size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">Aún no has publicado vacantes</p>
          <Link to="/app/publicar" className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium">Publicar primera vacante</Link>
        </div>
      ) : (
        <>
          {/* Tabla — desktop */}
          <div className="hidden md:block bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left text-xs font-display text-muted-foreground uppercase">
                  <th className="px-4 py-3">Puesto</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Postulantes</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 w-32 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium">{v.puesto}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.ubicacion ?? "—"}</td>
                    <td className="px-4 py-3"><Link to={`/app/postulantes?vacante=${v.id}`} className="text-primary hover:underline">{v.postulantes}</Link></td>
                    <td className="px-4 py-3"><StatusBadge estado={v.estado} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => toggle(v)} title={v.estado === "activa" ? "Cerrar" : "Activar"} className="text-muted-foreground hover:text-primary"><Eye size={16} /></button>
                        <button onClick={() => eliminar(v.id)} title="Eliminar" className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas — móvil */}
          <div className="md:hidden grid gap-3">
            {items.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-xl p-4 shadow-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display font-semibold text-foreground text-sm leading-tight">{v.puesto}</h3>
                  <StatusBadge estado={v.estado} />
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {v.ubicacion && <div className="flex items-center gap-1.5"><MapPin size={12} />{v.ubicacion}</div>}
                  <Link to={`/app/postulantes?vacante=${v.id}`} className="flex items-center gap-1.5 text-primary">
                    <UsersIcon size={12} /> {v.postulantes} postulante{v.postulantes !== 1 ? "s" : ""}
                  </Link>
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => toggle(v)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs font-display font-medium hover:bg-secondary"
                  >
                    <Eye size={14} /> {v.estado === "activa" ? "Cerrar" : "Activar"}
                  </button>
                  <button
                    onClick={() => eliminar(v.id)}
                    className="inline-flex items-center justify-center w-10 h-9 rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
