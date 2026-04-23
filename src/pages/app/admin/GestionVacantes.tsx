import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Vacante {
  id: string; puesto: string; estado: string; tipo_contrato: string;
  ubicacion: string | null; created_at: string;
  empresas: { razon_social: string } | null;
}

export default function GestionVacantes() {
  const [items, setItems] = useState<Vacante[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    let q = supabase.from("vacantes").select("*, empresas(razon_social)").order("created_at", { ascending: false });
    if (filter) q = q.eq("estado", filter as any);
    const { data } = await q;
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const toggle = async (v: Vacante) => {
    const nuevo = v.estado === "activa" ? "cerrada" : "activa";
    await supabase.from("vacantes").update({ estado: nuevo }).eq("id", v.id);
    toast.success(`Vacante ${nuevo}`);
    load();
  };
  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar vacante?")) return;
    await supabase.from("vacantes").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader title="Gestión de vacantes" subtitle="Supervisa todas las vacantes publicadas" />
      <div className="flex gap-2 mb-4">
        {["", "activa", "cerrada"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 h-9 rounded-lg text-xs font-display border ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
            {s === "" ? "Todas" : s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left text-xs font-display text-muted-foreground uppercase">
              <th className="px-4 py-3">Puesto</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Ubicación</th>
              <th className="px-4 py-3">Publicada</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-4 py-3 font-medium">{v.puesto}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.empresas?.razon_social ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{v.ubicacion ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge estado={v.estado} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => toggle(v)} className="text-xs text-primary hover:underline font-display">{v.estado === "activa" ? "Cerrar" : "Activar"}</button>
                    <button onClick={() => eliminar(v.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">Sin vacantes</div>}
      </div>
    </div>
  );
}
