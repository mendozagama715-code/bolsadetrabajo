import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Search, MapPin, Briefcase, Building2, X, Sparkles } from "lucide-react";
import { matchScore, matchLabel, type EgresadoPerfil } from "@/lib/matching";

interface Vacante {
  id: string;
  puesto: string;
  descripcion: string;
  requisitos: string | null;
  area: string | null;
  carrera_solicitada: string | null;
  ubicacion: string | null;
  tipo_contrato: string;
  salario_min: number | null;
  salario_max: number | null;
  fecha_cierre: string | null;
  empresa_id: string;
  empresas?: { razon_social: string; logo_url: string | null } | null;
  _score?: number;
}

const TIPOS: Record<string, string> = {
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  por_proyecto: "Por proyecto",
  practicas: "Prácticas",
};

export default function Vacantes() {
  const { egresadoId } = useAuth();
  const [perfil, setPerfil] = useState<EgresadoPerfil | null>(null);
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [misPostuladas, setMisPostuladas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [orden, setOrden] = useState<"match" | "recientes">("match");
  const [selected, setSelected] = useState<Vacante | null>(null);
  const [postulando, setPostulando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vacantes")
      .select("*")
      .eq("estado", "activa")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error cargando vacantes");
    const rows = (data as any[]) ?? [];
    const empIds = Array.from(new Set(rows.map((v) => v.empresa_id)));
    let empMap: Record<string, { razon_social: string; logo_url: string | null }> = {};
    if (empIds.length) {
      const { data: emps } = await supabase
        .from("empresas")
        .select("id, razon_social, logo_url")
        .in("id", empIds);
      (emps ?? []).forEach((e) => { empMap[e.id] = { razon_social: e.razon_social, logo_url: e.logo_url }; });
    }
    setVacantes(rows.map((v) => ({ ...v, empresas: empMap[v.empresa_id] ?? null })));
    if (egresadoId) {
      const [postsRes, egRes] = await Promise.all([
        supabase.from("postulaciones").select("vacante_id").eq("egresado_id", egresadoId),
        supabase.from("egresados").select("habilidades,experiencia,carrera,ubicacion").eq("id", egresadoId).maybeSingle(),
      ]);
      setMisPostuladas(new Set((postsRes.data ?? []).map((p) => p.vacante_id)));
      setPerfil(egRes.data ?? null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [egresadoId]);

  const tienePerfil = !!(perfil && ((perfil.habilidades?.length ?? 0) > 0 || perfil.experiencia || perfil.carrera));

  const vacantesConScore = useMemo(() => {
    if (!tienePerfil) return vacantes;
    return vacantes.map((v) => ({ ...v, _score: matchScore(perfil!, v) }));
  }, [vacantes, perfil, tienePerfil]);

  const postular = async () => {
    if (!selected || !egresadoId) return;
    setPostulando(true);
    const { error } = await supabase.from("postulaciones").insert({
      vacante_id: selected.id,
      egresado_id: egresadoId,
      mensaje: mensaje || null,
    });
    setPostulando(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Ya postulaste a esta vacante" : "No se pudo postular");
      return;
    }
    toast.success("¡Postulación enviada!");
    setMisPostuladas(new Set([...misPostuladas, selected.id]));
    setSelected(null);
    setMensaje("");
  };

  const filtered = useMemo(() => {
    let list = vacantesConScore.filter((v) => {
      const s = search.toLowerCase();
      const matchSearch = !s || v.puesto.toLowerCase().includes(s) || v.empresas?.razon_social?.toLowerCase().includes(s) || v.area?.toLowerCase().includes(s);
      const matchTipo = !tipo || v.tipo_contrato === tipo;
      return matchSearch && matchTipo;
    });
    if (orden === "match" && tienePerfil) {
      list = [...list].sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
    }
    return list;
  }, [vacantesConScore, search, tipo, orden, tienePerfil]);

  return (
    <div>
      <PageHeader title="Vacantes disponibles" subtitle="Encuentra oportunidades laborales en la región" />

      {!tienePerfil && !loading && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-display font-semibold text-foreground">Activa las recomendaciones inteligentes</p>
            <p className="text-muted-foreground mt-0.5">
              Completa tu perfil (habilidades, experiencia y carrera) para que el sistema te recomiende las vacantes más afines a tu CV.
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center shadow-card">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar puesto, empresa o área..."
            className="w-full pl-9 pr-3 h-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-10 px-3 bg-background border border-border rounded-lg text-sm">
          <option value="">Todos los contratos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {tienePerfil && (
          <select value={orden} onChange={(e) => setOrden(e.target.value as any)} className="h-10 px-3 bg-background border border-border rounded-lg text-sm">
            <option value="match">⭐ Recomendadas para ti</option>
            <option value="recientes">Más recientes</option>
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Briefcase size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No hay vacantes que coincidan con tu búsqueda</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((v) => {
            const yaPostulé = misPostuladas.has(v.id);
            const score = v._score ?? 0;
            const lbl = matchLabel(score);
            const toneCls = lbl.tone === "high" ? "bg-success/15 text-success" : lbl.tone === "mid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground";
            return (
              <div key={v.id} className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-md transition cursor-pointer" onClick={() => setSelected(v)}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                    {v.empresas?.logo_url ? <img src={v.empresas.logo_url} alt="" className="w-full h-full object-cover" /> : <Building2 size={20} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{v.puesto}</h3>
                        <p className="text-xs text-muted-foreground">{v.empresas?.razon_social}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tienePerfil && (
                          <span className={`inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-display font-semibold ${toneCls}`} title={lbl.text}>
                            <Sparkles size={10} /> {score}% match
                          </span>
                        )}
                        {yaPostulé && <StatusBadge estado="aprobado" className="!text-[10px]" />}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {v.ubicacion && <span className="flex items-center gap-1"><MapPin size={12} />{v.ubicacion}</span>}
                      <span className="flex items-center gap-1"><Briefcase size={12} />{TIPOS[v.tipo_contrato]}</span>
                      {v.salario_min && <span className="text-primary font-medium">${Number(v.salario_min).toLocaleString()}{v.salario_max ? ` - $${Number(v.salario_max).toLocaleString()}` : ""}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl max-w-2xl w-full my-4 max-h-[calc(100vh-2rem)] flex flex-col shadow-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-start justify-between shrink-0">
              <div>
                <h2 className="font-display text-xl font-semibold">{selected.puesto}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{selected.empresas?.razon_social}</p>
                {tienePerfil && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs">
                    <Sparkles size={12} className="text-primary" />
                    <span className="font-display font-semibold text-foreground">{selected._score ?? 0}% match</span>
                    <span className="text-muted-foreground">— {matchLabel(selected._score ?? 0).text}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 text-sm overflow-y-auto flex-1">
              <div className="flex flex-wrap gap-2 text-xs">
                {selected.ubicacion && <span className="badge-pill bg-secondary text-secondary-foreground">{selected.ubicacion}</span>}
                <span className="badge-pill bg-secondary text-secondary-foreground">{TIPOS[selected.tipo_contrato]}</span>
                {selected.area && <span className="badge-pill bg-secondary text-secondary-foreground">{selected.area}</span>}
                {selected.salario_min && <span className="badge-pill bg-primary/10 text-primary">${Number(selected.salario_min).toLocaleString()}{selected.salario_max ? ` - $${Number(selected.salario_max).toLocaleString()}` : ""}</span>}
              </div>
              <div>
                <h3 className="font-display font-semibold mb-1">Descripción</h3>
                <p className="text-muted-foreground whitespace-pre-line">{selected.descripcion}</p>
              </div>
              {selected.requisitos && (
                <div>
                  <h3 className="font-display font-semibold mb-1">Requisitos</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{selected.requisitos}</p>
                </div>
              )}
              {!misPostuladas.has(selected.id) && (
                <div>
                  <h3 className="font-display font-semibold mb-1">Mensaje (opcional)</h3>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={3}
                    placeholder="¿Por qué te interesa este puesto?"
                    className="w-full p-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2 shrink-0">
              <button onClick={() => setSelected(null)} className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary">Cerrar</button>
              {misPostuladas.has(selected.id) ? (
                <span className="px-4 h-10 inline-flex items-center rounded-lg bg-success/15 text-success text-sm font-display">Ya postulaste</span>
              ) : (
                <button onClick={postular} disabled={postulando} className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 disabled:opacity-50">
                  {postulando ? "Enviando..." : "Postularme"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
