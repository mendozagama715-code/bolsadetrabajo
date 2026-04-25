import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { crearNotificacion } from "@/lib/notifications";

interface Egresado {
  id: string; user_id: string; carrera: string | null; matricula: string | null;
  anio_egreso: number | null; estado: string; created_at: string;
  experiencia?: string | null; habilidades?: string[] | null; ubicacion?: string | null;
  cv_url?: string | null; motivo_rechazo?: string | null;
  nombre?: string; telefono?: string | null;
}

interface Empresa {
  id: string; user_id: string; razon_social: string; rfc: string;
  giro?: string | null; estado: string; created_at: string;
  descripcion?: string | null; sitio_web?: string | null; direccion?: string | null;
  responsable?: string | null; motivo_rechazo?: string | null; logo_url?: string | null;
}

export default function GestionUsuarios() {
  const [tab, setTab] = useState<"egresados" | "empresas">("egresados");
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  const load = async () => {
    if (tab === "egresados") {
      let q = supabase.from("egresados").select("*").order("created_at", { ascending: false });
      if (filter) q = q.eq("estado", filter as any);
      const { data } = await q;
      const userIds = (data ?? []).map((d) => d.user_id);
      const { data: profs } = userIds.length ? await supabase.from("profiles").select("user_id,nombre,telefono").in("user_id", userIds) : { data: [] };
      const map: Record<string, { nombre: string; telefono: string | null }> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = { nombre: p.nombre, telefono: p.telefono }; });
      setItems((data ?? []).map((d: any) => ({ ...d, nombre: map[d.user_id]?.nombre, telefono: map[d.user_id]?.telefono })));
    } else {
      let q = supabase.from("empresas").select("*").order("created_at", { ascending: false });
      if (filter) q = q.eq("estado", filter as any);
      const { data } = await q;
      setItems((data ?? []) as any);
    }
  };
  useEffect(() => { load(); }, [tab, filter]);

  const cambiarEstado = async (item: any, nuevo: "aprobado" | "rechazado") => {
    const tabla = tab === "egresados" ? "egresados" : "empresas";
    const { error } = await supabase.from(tabla).update({ estado: nuevo, motivo_rechazo: null } as any).eq("id", item.id);
    if (error) return toast.error("Error");
    const esEgresado = tab === "egresados";
    await crearNotificacion({
      user_id: item.user_id,
      titulo: nuevo === "aprobado"
        ? (esEgresado ? "¡Tu cuenta fue aprobada!" : "¡Tu empresa fue aprobada!")
        : (esEgresado ? "Tu cuenta fue rechazada" : "Tu empresa fue rechazada"),
      mensaje: nuevo === "aprobado"
        ? (esEgresado ? "Ya puedes postularte a vacantes en la bolsa de trabajo." : "Ya puedes publicar vacantes en la bolsa de trabajo.")
        : "Contacta al administrador para más información.",
      tipo: nuevo === "aprobado" ? "exito" : "error",
      enlace: "/app",
    });
    toast.success(`${nuevo === "aprobado" ? "Aprobado" : "Rechazado"}`);
    setSelected(null);
    load();
  };

  const verDetalle = async (item: any) => {
    setCvUrl(null);
    setSelected(item);
    if (tab === "egresados" && item.cv_url) {
      const { data } = await supabase.storage.from("cvs").createSignedUrl(item.cv_url, 3600);
      if (data?.signedUrl) setCvUrl(data.signedUrl);
    }
  };

  return (
    <div>
      <PageHeader title="Gestión de usuarios" subtitle="Administra egresados y empresas" />
      <div className="flex gap-2 mb-4">
        <div className="flex bg-secondary rounded-lg p-1">
          {(["egresados", "empresas"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }} className={`px-4 h-8 rounded-md text-xs font-display font-medium ${tab === t ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
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
                  <><th className="px-4 py-3">Razón social</th><th className="px-4 py-3">RFC</th><th className="px-4 py-3">Giro</th></>
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
                    <><td className="px-4 py-3 font-medium">{it.razon_social}</td><td className="px-4 py-3 text-muted-foreground">{it.rfc}</td><td className="px-4 py-3 text-muted-foreground">{it.giro ?? "—"}</td></>
                  )}
                  <td className="px-4 py-3 text-muted-foreground">{new Date(it.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge estado={it.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => verDetalle(it)} className="text-muted-foreground hover:text-primary" title="Ver detalle"><Eye size={16} /></button>
                      {it.estado !== "aprobado" && <button onClick={() => cambiarEstado(it, "aprobado")} className="text-success hover:opacity-70" title="Aprobar"><Check size={16} /></button>}
                      {it.estado !== "rechazado" && <button onClick={() => cambiarEstado(it, "rechazado")} className="text-destructive hover:opacity-70" title="Rechazar"><X size={16} /></button>}
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
            <div className="p-6 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {tab === "egresados" ? (selected.nombre ?? "Egresado") : selected.razon_social}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tab === "egresados" ? `Matrícula: ${selected.matricula ?? "—"}` : `RFC: ${selected.rfc}`}
                </p>
              </div>
              <StatusBadge estado={selected.estado} />
            </div>
            <div className="p-6 space-y-3 text-sm">
              {tab === "egresados" ? (
                <>
                  <Info label="Teléfono" value={selected.telefono} />
                  <Info label="Carrera" value={selected.carrera} />
                  <Info label="Año de egreso" value={selected.anio_egreso?.toString()} />
                  <Info label="Ubicación" value={selected.ubicacion} />
                  <Info label="Habilidades" value={selected.habilidades?.join(", ")} />
                  <Info label="Experiencia" value={selected.experiencia} />
                  {cvUrl && (
                    <div>
                      <span className="font-display text-xs uppercase text-muted-foreground">CV: </span>
                      <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">Descargar / Ver</a>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Info label="Giro" value={selected.giro} />
                  <Info label="Responsable" value={selected.responsable} />
                  <Info label="Dirección" value={selected.direccion} />
                  <Info label="Sitio web" value={selected.sitio_web} />
                  <Info label="Descripción" value={selected.descripcion} />
                </>
              )}
              {selected.motivo_rechazo && <Info label="Motivo de rechazo" value={selected.motivo_rechazo} />}
              <Info label="Fecha de registro" value={new Date(selected.created_at).toLocaleString()} />
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary">Cerrar</button>
              {selected.estado !== "rechazado" && (
                <button onClick={() => cambiarEstado(selected, "rechazado")} className="px-4 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-display font-medium">Rechazar</button>
              )}
              {selected.estado !== "aprobado" && (
                <button onClick={() => cambiarEstado(selected, "aprobado")} className="px-4 h-10 rounded-lg bg-success text-success-foreground text-sm font-display font-medium">Aprobar</button>
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
