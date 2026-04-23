import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface Egresado {
  id: string; user_id: string; carrera: string | null; matricula: string | null;
  anio_egreso: number | null; estado: string; created_at: string;
  nombre?: string;
}

export default function GestionUsuarios() {
  const [tab, setTab] = useState<"egresados" | "empresas">("egresados");
  const [items, setItems] = useState<Egresado[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    if (tab === "egresados") {
      let q = supabase.from("egresados").select("*").order("created_at", { ascending: false });
      if (filter) q = q.eq("estado", filter as any);
      const { data } = await q;
      const userIds = (data ?? []).map((d) => d.user_id);
      const { data: profs } = userIds.length ? await supabase.from("profiles").select("user_id,nombre").in("user_id", userIds) : { data: [] };
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => { map[p.user_id] = p.nombre; });
      setItems((data ?? []).map((d: any) => ({ ...d, nombre: map[d.user_id] })));
    } else {
      let q = supabase.from("empresas").select("id,user_id,razon_social,rfc,estado,created_at").order("created_at", { ascending: false });
      if (filter) q = q.eq("estado", filter as any);
      const { data } = await q;
      setItems((data ?? []) as any);
    }
  };
  useEffect(() => { load(); }, [tab, filter]);

  const cambiarEstado = async (id: string, nuevo: "aprobado" | "rechazado") => {
    const tabla = tab === "egresados" ? "egresados" : "empresas";
    const { error } = await supabase.from(tabla).update({ estado: nuevo, motivo_rechazo: null } as any).eq("id", id);
    if (error) return toast.error("Error");
    toast.success(`${nuevo === "aprobado" ? "Aprobado" : "Rechazado"}`);
    load();
  };

  return (
    <div>
      <PageHeader title="Gestión de usuarios" subtitle="Administra egresados y empresas" />
      <div className="flex gap-2 mb-4">
        <div className="flex bg-secondary rounded-lg p-1">
          {(["egresados", "empresas"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 h-8 rounded-md text-xs font-display font-medium ${tab === t ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
              {t === "egresados" ? "Egresados" : "Empresas"}
            </button>
          ))}
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 px-3 bg-background border border-border rounded-lg text-sm">
          <option value="">Todos</option>
          <option value="pendiente">Pendientes</option>
          <option value="aprobado">Aprobados</option>
          <option value="rechazado">Rechazados</option>
        </select>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center text-sm text-muted-foreground">Sin registros</div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left text-xs font-display text-muted-foreground uppercase">
                {tab === "egresados" ? (
                  <><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Matrícula</th><th className="px-4 py-3">Carrera</th></>
                ) : (
                  <><th className="px-4 py-3">Razón social</th><th className="px-4 py-3">RFC</th><th className="px-4 py-3"></th></>
                )}
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-t border-border hover:bg-secondary/30">
                  {tab === "egresados" ? (
                    <><td className="px-4 py-3 font-medium">{it.nombre ?? "—"}</td><td className="px-4 py-3 text-muted-foreground">{it.matricula ?? "—"}</td><td className="px-4 py-3 text-muted-foreground">{it.carrera ?? "—"}</td></>
                  ) : (
                    <><td className="px-4 py-3 font-medium">{it.razon_social}</td><td className="px-4 py-3 text-muted-foreground">{it.rfc}</td><td></td></>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">{new Date(it.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge estado={it.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {it.estado !== "aprobado" && <button onClick={() => cambiarEstado(it.id, "aprobado")} className="text-success hover:opacity-70" title="Aprobar"><Check size={16} /></button>}
                      {it.estado !== "rechazado" && <button onClick={() => cambiarEstado(it.id, "rechazado")} className="text-destructive hover:opacity-70" title="Rechazar"><X size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
