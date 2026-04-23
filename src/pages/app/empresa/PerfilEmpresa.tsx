import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Upload } from "lucide-react";

const inputCls = "w-full px-3 h-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function PerfilEmpresa() {
  const { user, empresaId, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [f, setF] = useState({
    razon_social: "", rfc: "", giro: "", direccion: "", sitio_web: "",
    descripcion: "", responsable: "", logo_url: "",
  });

  useEffect(() => {
    (async () => {
      if (!user || !empresaId) return;
      const [p, e] = await Promise.all([
        supabase.from("profiles").select("nombre,telefono").eq("user_id", user.id).maybeSingle(),
        supabase.from("empresas").select("*").eq("id", empresaId).maybeSingle(),
      ]);
      setNombre(p.data?.nombre ?? "");
      setTelefono(p.data?.telefono ?? "");
      if (e.data) setF({
        razon_social: e.data.razon_social ?? "", rfc: e.data.rfc ?? "",
        giro: e.data.giro ?? "", direccion: e.data.direccion ?? "",
        sitio_web: e.data.sitio_web ?? "", descripcion: e.data.descripcion ?? "",
        responsable: e.data.responsable ?? "", logo_url: e.data.logo_url ?? "",
      });
      setLoading(false);
    })();
  }, [user, empresaId]);

  const save = async () => {
    if (!user || !empresaId) return;
    setSaving(true);
    const [p, e] = await Promise.all([
      supabase.from("profiles").update({ nombre, telefono: telefono || null }).eq("user_id", user.id),
      supabase.from("empresas").update({
        razon_social: f.razon_social, rfc: f.rfc,
        giro: f.giro || null, direccion: f.direccion || null,
        sitio_web: f.sitio_web || null, descripcion: f.descripcion || null,
        responsable: f.responsable || null, logo_url: f.logo_url || null,
      }).eq("id", empresaId),
    ]);
    setSaving(false);
    if (p.error || e.error) return toast.error("Error al guardar");
    toast.success("Perfil actualizado");
    refresh();
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) return toast.error("Error al subir logo");
    const { data: pub } = supabase.storage.from("logos").getPublicUrl(path);
    setF({ ...f, logo_url: pub.publicUrl });
    toast.success("Logo subido — recuerda guardar");
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Perfil de empresa" subtitle="Información que verán los egresados" />
      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden flex items-center justify-center">
            {f.logo_url ? <img src={f.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="font-display text-2xl text-primary">{f.razon_social[0] ?? "E"}</span>}
          </div>
          <label className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-border text-sm font-display cursor-pointer hover:bg-secondary">
            <Upload size={16} />Cambiar logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Razón social"><input value={f.razon_social} onChange={(e) => setF({ ...f, razon_social: e.target.value })} className={inputCls} /></Field>
          <Field label="RFC"><input value={f.rfc} onChange={(e) => setF({ ...f, rfc: e.target.value })} className={inputCls} /></Field>
          <Field label="Giro"><input value={f.giro} onChange={(e) => setF({ ...f, giro: e.target.value })} className={inputCls} /></Field>
          <Field label="Sitio web"><input value={f.sitio_web} onChange={(e) => setF({ ...f, sitio_web: e.target.value })} className={inputCls} /></Field>
          <Field label="Responsable"><input value={f.responsable} onChange={(e) => setF({ ...f, responsable: e.target.value })} className={inputCls} /></Field>
          <Field label="Teléfono contacto"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} /></Field>
          <Field label="Nombre del responsable (cuenta)"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Dirección"><input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} className={inputCls} /></Field>
        <Field label="Descripción"><textarea rows={4} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={inputCls} /></Field>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="font-display text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">{label}</label>{children}</div>;
}
