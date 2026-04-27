import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { crearNotificacion } from "@/lib/notifications";
import { Users, FileText, X } from "lucide-react";

interface Postulante {
  id: string;
  estado: string;
  mensaje: string | null;
  notas_empresa: string | null;
  created_at: string;
  vacante_id: string;
  egresado_id: string;
  vacantes: { puesto: string } | null;
  egresados: {
    id: string;
    user_id: string;
    carrera: string | null;
    ubicacion: string | null;
    experiencia: string | null;
    habilidades: string[] | null;
    cv_url: string | null;
    profiles?: { nombre: string } | null;
  } | null;
}

const ESTADOS = ["pendiente", "en_revision", "proceso", "contratado", "rechazado"];
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  proceso: "En proceso",
  contratado: "Contratado",
  rechazado: "Rechazado",
};

export default function Postulantes() {
  const { empresaId } = useAuth();
  const [params] = useSearchParams();
  const filtroVac = params.get("vacante");
  const [items, setItems] = useState<Postulante[]>([]);
  const [vacantes, setVacantes] = useState<{ id: string; puesto: string }[]>([]);
  const [vac, setVac] = useState<string>(filtroVac ?? "");
  const [estado, setEstado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Postulante | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [notas, setNotas] = useState("");

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data: vacs } = await supabase.from("vacantes").select("id,puesto").eq("empresa_id", empresaId);
    setVacantes(vacs ?? []);
    const ids = (vacs ?? []).map((v) => v.id);
    if (ids.length === 0) { setItems([]); setLoading(false); return; }

    let q = supabase.from("postulaciones")
      .select("*")
      .in("vacante_id", ids)
      .order("created_at", { ascending: false });
    if (vac) q = q.eq("vacante_id", vac);
    if (estado) q = q.eq("estado", estado as any);

    const { data } = await q;
    const rows = data ?? [];

    // Vacantes map
    const vacMap: Record<string, { puesto: string }> = {};
    (vacs ?? []).forEach((v: any) => { vacMap[v.id] = { puesto: v.puesto }; });

    // Egresados
    const egIds = Array.from(new Set(rows.map((r: any) => r.egresado_id)));
    const egMap: Record<string, any> = {};
    if (egIds.length) {
      const { data: egs } = await supabase
        .from("egresados")
        .select("id,user_id,carrera,ubicacion,experiencia,habilidades,cv_url")
        .in("id", egIds);
      (egs ?? []).forEach((e) => { egMap[e.id] = e; });
    }

    // Profiles
    const userIds = Array.from(new Set(Object.values(egMap).map((e: any) => e.user_id).filter(Boolean)));
    let names: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id,nombre").in("user_id", userIds);
      (profs ?? []).forEach((p) => { names[p.user_id] = p.nombre; });
    }
    const enriched = rows.map((p: any) => ({
      ...p,
      vacantes: vacMap[p.vacante_id] ?? null,
      egresados: egMap[p.egresado_id] ? { ...egMap[p.egresado_id], profiles: { nombre: names[egMap[p.egresado_id].user_id] ?? "Egresado" } } : null,
    }));
    setItems(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId, vac, estado]);

  const openDetail = async (p: Postulante) => {
    setSelected(p);
    setNotas(p.notas_empresa ?? "");
    setCvUrl(null);
    if (p.egresados?.cv_url) {
      const { data } = await supabase.storage.from("cvs").createSignedUrl(p.egresados.cv_url, 3600);
      setCvUrl(data?.signedUrl ?? null);
    }
  };

  const navigate = useNavigate();

  const cambiarEstado = async (nuevo: string) => {
    if (!selected) return;
    const { error } = await supabase.from("postulaciones").update({ estado: nuevo as any, notas_empresa: notas || null }).eq("id", selected.id);
    if (error) return toast.error("Error al actualizar");

    // Notificar al egresado
    const userId = selected.egresados?.user_id;
    if (userId) {
      const labels: Record<string, { titulo: string; mensaje: string; tipo: "info" | "exito" | "advertencia" | "error" }> = {
        en_revision: { titulo: "Tu postulación está en revisión", mensaje: `La empresa está revisando tu postulación a "${selected.vacantes?.puesto ?? ""}".`, tipo: "info" },
        proceso: { titulo: "¡Avanzaste de etapa!", mensaje: `Tu postulación a "${selected.vacantes?.puesto ?? ""}" está en proceso. Pronto serás contactado.`, tipo: "exito" },
        contratado: { titulo: "¡Felicidades, fuiste contratado!", mensaje: `Has sido contratado para "${selected.vacantes?.puesto ?? ""}".`, tipo: "exito" },
        rechazado: { titulo: "Postulación no seleccionada", mensaje: `Tu postulación a "${selected.vacantes?.puesto ?? ""}" no fue seleccionada en esta ocasión.`, tipo: "advertencia" },
      };
      const n = labels[nuevo];
      if (n) await crearNotificacion({ user_id: userId, titulo: n.titulo, mensaje: n.mensaje, tipo: n.tipo, enlace: "/app/postulaciones" });
    }

    toast.success("Postulación actualizada");
    const sel = selected;
    setSelected(null);
    load();

    // Si pasa a "proceso" o "contratado", llevar al calendario para agendar
    if (nuevo === "proceso" || nuevo === "contratado") {
      const tipoEvento = nuevo === "contratado" ? "contratacion" : "entrevista";
      const titulo = nuevo === "contratado"
        ? `Contratación: ${sel.egresados?.profiles?.nombre ?? "Candidato"}`
        : `Entrevista: ${sel.egresados?.profiles?.nombre ?? "Candidato"} — ${sel.vacantes?.puesto ?? ""}`;
      const params = new URLSearchParams({
        nuevo: "1",
        titulo,
        tipo: tipoEvento,
        postulacion: sel.id,
      });
      navigate(`/app/calendario?${params.toString()}`);
    }
  };

  return (
    <div>
      <PageHeader title="Postulantes" subtitle="Revisa y gestiona los candidatos a tus vacantes" />

      <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 shadow-card">
        <select value={vac} onChange={(e) => setVac(e.target.value)} className="h-10 px-3 bg-background border border-border rounded-lg text-sm flex-1 min-w-[200px]">
          <option value="">Todas las vacantes</option>
          {vacantes.map((v) => <option key={v.id} value={v.id}>{v.puesto}</option>)}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-10 px-3 bg-background border border-border rounded-lg text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Users size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No hay postulantes con estos filtros</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left text-xs font-display text-muted-foreground uppercase">
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Vacante</th>
                <th className="px-4 py-3">Carrera</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => openDetail(p)}>
                  <td className="px-4 py-3 font-medium">{p.egresados?.profiles?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.vacantes?.puesto ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.egresados?.carrera ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusBadge estado={p.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">{selected.egresados?.profiles?.nombre}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Postula a: {selected.vacantes?.puesto}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Carrera" value={selected.egresados?.carrera} />
                <Info label="Ubicación" value={selected.egresados?.ubicacion} />
              </div>
              {selected.egresados?.experiencia && <div><div className="font-display text-xs uppercase text-muted-foreground mb-1">Experiencia</div><p className="text-muted-foreground whitespace-pre-line">{selected.egresados.experiencia}</p></div>}
              {selected.egresados?.habilidades?.length ? (
                <div>
                  <div className="font-display text-xs uppercase text-muted-foreground mb-1">Habilidades</div>
                  <div className="flex flex-wrap gap-1.5">{selected.egresados.habilidades.map((h) => <span key={h} className="badge-pill bg-secondary text-secondary-foreground">{h}</span>)}</div>
                </div>
              ) : null}
              {selected.mensaje && <div><div className="font-display text-xs uppercase text-muted-foreground mb-1">Mensaje del candidato</div><p className="text-muted-foreground italic">"{selected.mensaje}"</p></div>}
              {cvUrl && <a href={cvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm"><FileText size={16} />Descargar CV</a>}
              <div>
                <div className="font-display text-xs uppercase text-muted-foreground mb-1">Notas internas</div>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} className="w-full p-3 bg-background border border-border rounded-lg text-sm" />
              </div>
            </div>
            <div className="p-4 border-t border-border flex flex-wrap justify-end gap-2">
              {ESTADOS.map((e) => (
                <button key={e} onClick={() => cambiarEstado(e)} className={`px-3 h-9 rounded-lg text-xs font-display font-medium border ${selected.estado === e ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
                  {e.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="font-display text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-foreground">{value ?? "—"}</div>
    </div>
  );
}
