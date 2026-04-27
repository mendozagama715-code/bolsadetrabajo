import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Search, MapPin, Briefcase, Building2, X } from "lucide-react";

interface Vacante {
  id: string;
  puesto: string;
  descripcion: string;
  requisitos: string | null;
  area: string | null;
  ubicacion: string | null;
  tipo_contrato: string;
  salario_min: number | null;
  salario_max: number | null;
  fecha_cierre: string | null;
  empresa_id: string;
  empresas?: { razon_social: string; logo_url: string | null } | null;
}

const TIPOS: Record<string, string> = {
  tiempo_completo: "Tiempo completo",
  medio_tiempo: "Medio tiempo",
  por_proyecto: "Por proyecto",
  practicas: "Prácticas",
};

export default function Vacantes() {
  const { egresadoId } = useAuth();
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [misPostuladas, setMisPostuladas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState<string>("");
  const [selected, setSelected] = useState<Vacante | null>(null);
  const [postulando, setPostulando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vacantes")
      .select("*, empresas(razon_social, logo_url)")
      .eq("estado", "activa")
      .order("created_at", { ascending: false });
    if (error) toast.error("Error cargando vacantes");
    setVacantes((data as Vacante[]) ?? []);
    if (egresadoId) {
      const { data: posts } = await supabase
        .from("postulaciones")
        .select("vacante_id")
        .eq("egresado_id", egresadoId);
      setMisPostuladas(new Set((posts ?? []).map((p) => p.vacante_id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [egresadoId]);

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

  const filtered = vacantes.filter((v) => {
    const s = search.toLowerCase();
    const matchSearch = !s || v.puesto.toLowerCase().includes(s) || v.empresas?.razon_social?.toLowerCase().includes(s) || v.area?.toLowerCase().includes(s);
    const matchTipo = !tipo || v.tipo_contrato === tipo;
    return matchSearch && matchTipo;
  });

  return (
    <div>
      <PageHeader title="Vacantes disponibles" subtitle="Encuentra oportunidades laborales en la región" />

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
                      {yaPostulé && <StatusBadge estado="aprobado" className="!text-[10px]" />}
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
