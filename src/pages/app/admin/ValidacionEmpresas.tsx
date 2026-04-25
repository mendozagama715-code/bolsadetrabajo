import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { crearNotificacion } from "@/lib/notifications";

interface Empresa {
  id: string; user_id: string; razon_social: string; rfc: string; giro: string | null;
  estado: string; motivo_rechazo: string | null; descripcion: string | null;
  sitio_web: string | null; direccion: string | null; responsable: string | null;
  created_at: string;
}

export default function ValidacionEmpresas() {
  const [items, setItems] = useState<Empresa[]>([]);
  const [filter, setFilter] = useState("pendiente");
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [motivo, setMotivo] = useState("");

  const load = async () => {
    let q = supabase.from("empresas").select("*").order("created_at", { ascending: false });
    if (filter) q = q.eq("estado", filter as any);
    const { data } = await q;
    setItems((data as Empresa[]) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const aprobar = async (emp: Empresa) => {
    const { error } = await supabase.from("empresas").update({ estado: "aprobado", motivo_rechazo: null }).eq("id", emp.id);
    if (error) return toast.error("Error");
    await crearNotificacion({
      user_id: emp.user_id,
      titulo: "¡Tu empresa fue aprobada!",
      mensaje: `${emp.razon_social} ya puede publicar vacantes en la bolsa de trabajo.`,
      tipo: "exito",
      enlace: "/app",
    });
    toast.success("Empresa aprobada");
    setSelected(null); load();
  };
  const rechazar = async () => {
    if (!selected || !motivo) return toast.error("Indica el motivo");
    const { error } = await supabase.from("empresas").update({ estado: "rechazado", motivo_rechazo: motivo }).eq("id", selected.id);
    if (error) return toast.error("Error");
    await crearNotificacion({
      user_id: selected.user_id,
      titulo: "Solicitud de empresa rechazada",
      mensaje: `Motivo: ${motivo}`,
      tipo: "error",
      enlace: "/app",
    });
    toast.success("Empresa rechazada");
    setSelected(null); setMotivo(""); load();
  };

  return (
    <div>
      <PageHeader title="Validación de empresas" subtitle="Aprueba o rechaza solicitudes de registro" />
      <div className="flex gap-2 mb-4">
        {["pendiente", "aprobado", "rechazado", ""].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 h-9 rounded-lg text-xs font-display border ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
            {s === "" ? "Todas" : s}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-sm text-muted-foreground">Sin empresas en este estado</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left text-xs font-display text-muted-foreground uppercase">
                <th className="px-4 py-3">Razón social</th>
                <th className="px-4 py-3">RFC</th>
                <th className="px-4 py-3">Giro</th>
                <th className="px-4 py-3">Solicitud</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-24 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{e.razon_social}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.rfc}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.giro ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge estado={e.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setSelected(e)} className="text-muted-foreground hover:text-primary"><Eye size={16} /></button>
                      {e.estado === "pendiente" && (
                        <>
                          <button onClick={() => aprobar(e)} className="text-success hover:opacity-70"><Check size={16} /></button>
                          <button onClick={() => setSelected(e)} className="text-destructive hover:opacity-70"><X size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">{selected.razon_social}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">RFC: {selected.rfc}</p>
              </div>
              <StatusBadge estado={selected.estado} />
            </div>
            <div className="p-6 space-y-3 text-sm">
              <Info label="Giro" value={selected.giro} />
              <Info label="Responsable" value={selected.responsable} />
              <Info label="Dirección" value={selected.direccion} />
              <Info label="Sitio web" value={selected.sitio_web} />
              <Info label="Descripción" value={selected.descripcion} />
              {selected.motivo_rechazo && <Info label="Motivo de rechazo" value={selected.motivo_rechazo} />}
              {selected.estado === "pendiente" && (
                <div className="pt-2">
                  <label className="font-display text-xs uppercase text-muted-foreground block mb-1.5">Motivo de rechazo (opcional para aprobar)</label>
                  <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} className="w-full p-3 bg-background border border-border rounded-lg text-sm" />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => { setSelected(null); setMotivo(""); }} className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary">Cerrar</button>
              {selected.estado === "pendiente" && (
                <>
                  <button onClick={rechazar} className="px-4 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-display font-medium">Rechazar</button>
                  <button onClick={() => aprobar(selected)} className="px-4 h-10 rounded-lg bg-success text-success-foreground text-sm font-display font-medium">Aprobar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return value ? <div><span className="font-display text-xs uppercase text-muted-foreground">{label}: </span><span className="text-foreground">{value}</span></div> : null;
}
