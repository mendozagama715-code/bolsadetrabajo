import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Calendar as Cal, Trash2, X } from "lucide-react";

interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string | null;
  tipo: string;
}

export default function Calendario() {
  const { empresaId } = useAuth();
  const [items, setItems] = useState<Evento[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ titulo: "", descripcion: "", fecha: "", hora: "", tipo: "entrevista" });

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("eventos_seguimiento").select("*").eq("empresa_id", empresaId).order("fecha", { ascending: true });
    setItems((data as Evento[]) ?? []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const guardar = async () => {
    if (!empresaId || !f.titulo || !f.fecha) return toast.error("Título y fecha obligatorios");
    const { error } = await supabase.from("eventos_seguimiento").insert({
      empresa_id: empresaId,
      titulo: f.titulo,
      descripcion: f.descripcion || null,
      fecha: f.fecha,
      hora: f.hora || null,
      tipo: f.tipo as any,
    });
    if (error) return toast.error("Error");
    toast.success("Evento agregado");
    setOpen(false); setF({ titulo: "", descripcion: "", fecha: "", hora: "", tipo: "entrevista" });
    load();
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar evento?")) return;
    await supabase.from("eventos_seguimiento").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Calendario de seguimiento"
        subtitle="Eventos, entrevistas y recordatorios"
        actions={<button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90"><Plus size={16} />Nuevo evento</button>}
      />

      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Cal size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Sin eventos programados</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((e) => (
            <div key={e.id} className="bg-card border border-border rounded-xl p-4 shadow-card flex items-start gap-4">
              <div className="bg-primary/10 text-primary rounded-lg w-14 h-14 flex flex-col items-center justify-center shrink-0">
                <span className="font-display text-[10px] uppercase">{new Date(e.fecha).toLocaleDateString("es-MX", { month: "short" })}</span>
                <span className="font-display text-xl font-bold">{new Date(e.fecha).getDate()}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold">{e.titulo}</h3>
                  <span className="badge-pill bg-secondary text-secondary-foreground capitalize">{e.tipo}</span>
                </div>
                {e.hora && <p className="text-xs text-muted-foreground mt-0.5">{e.hora.slice(0, 5)} hrs</p>}
                {e.descripcion && <p className="text-sm text-muted-foreground mt-1">{e.descripcion}</p>}
              </div>
              <button onClick={() => eliminar(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-xl max-w-md w-full shadow-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Nuevo evento</h2>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="Título"><input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={inputCls} /></Field>
              <Field label="Tipo">
                <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={inputCls}>
                  <option value="contacto">Contacto</option>
                  <option value="entrevista">Entrevista</option>
                  <option value="contratacion">Contratación</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha"><input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={inputCls} /></Field>
                <Field label="Hora"><input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Descripción"><textarea rows={3} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary">Cancelar</button>
              <button onClick={guardar} className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const inputCls = "w-full px-3 h-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="font-display text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">{label}</label>{children}</div>;
}
