import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Bell, BellOff } from "lucide-react";
import { ensurePushSubscription, disablePushSubscription, isPushSupported } from "@/lib/push";

const CARRERAS = [
  "Ingeniería en Desarrollo Sustentable con Orientación en Veterinaria y Zootecnia",
  "Ingeniería en Desarrollo Sustentable con Orientación en Eco-Biología",
  "Ingeniería en Tecnologías de la Información y Comunicaciones",
  "Ingeniería Agroindustrial",
  "Ingeniería en Sistemas Computacionales",
  "Licenciatura en Administración y Negocios",
];

export default function PerfilEgresado() {
  const { user, egresadoId, profile, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [matricula, setMatricula] = useState("");
  const [carrera, setCarrera] = useState("");
  const [anioEgreso, setAnioEgreso] = useState<string>("");
  const [ubicacion, setUbicacion] = useState("");
  const [experiencia, setExperiencia] = useState("");
  const [habilidades, setHabilidades] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!user || !egresadoId) return;
      // Evita recargar (y borrar lo que el usuario está escribiendo) cuando
      // Supabase dispara TOKEN_REFRESHED al volver a la pestaña del navegador.
      if (loadedFor.current === egresadoId) return;
      loadedFor.current = egresadoId;
      const [pRes, eRes] = await Promise.all([
        supabase.from("profiles").select("nombre,telefono").eq("user_id", user.id).maybeSingle(),
        supabase.from("egresados").select("*").eq("id", egresadoId).maybeSingle(),
      ]);
      setNombre(pRes.data?.nombre ?? "");
      setTelefono(pRes.data?.telefono ?? "");
      setMatricula(eRes.data?.matricula ?? "");
      setCarrera(eRes.data?.carrera ?? "");
      setAnioEgreso(eRes.data?.anio_egreso?.toString() ?? "");
      setUbicacion(eRes.data?.ubicacion ?? "");
      setExperiencia(eRes.data?.experiencia ?? "");
      setHabilidades((eRes.data?.habilidades ?? []).join(", "));
      setNotifEmail((eRes.data as any)?.notif_email_vacantes ?? true);
      setNotifPush((eRes.data as any)?.notif_push_vacantes ?? false);
      setCvPath(eRes.data?.cv_url ?? null);
      if (eRes.data?.cv_url) {
        const { data: signed } = await supabase.storage.from("cvs").createSignedUrl(eRes.data.cv_url, 3600);
        setCvUrl(signed?.signedUrl ?? null);
      }
      setLoading(false);
    })();
  }, [user, egresadoId]);

  const save = async () => {
    if (!user || !egresadoId) return;
    setSaving(true);
    const [p, e] = await Promise.all([
      supabase.from("profiles").update({ nombre, telefono: telefono || null }).eq("user_id", user.id),
      supabase.from("egresados").update({
        matricula: matricula || null,
        carrera: carrera || null,
        anio_egreso: anioEgreso ? parseInt(anioEgreso) : null,
        ubicacion: ubicacion || null,
        experiencia: experiencia || null,
        habilidades: habilidades ? habilidades.split(",").map((h) => h.trim()).filter(Boolean) : null,
        notif_email_vacantes: notifEmail,
        notif_push_vacantes: notifPush,
      } as any).eq("id", egresadoId),
    ]);
    setSaving(false);
    if (p.error || e.error) return toast.error("Error al guardar");
    toast.success("Perfil actualizado");
    refresh();
  };

  const togglePush = async (enable: boolean) => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (enable) {
        const r = await ensurePushSubscription(user.id);
        if (!r.ok) { toast.error(r.reason ?? "No se pudo activar"); return; }
        await supabase.from("egresados").update({ notif_push_vacantes: true } as any).eq("id", egresadoId!);
        setNotifPush(true);
        toast.success("Notificaciones push activadas");
      } else {
        await disablePushSubscription(user.id);
        await supabase.from("egresados").update({ notif_push_vacantes: false } as any).eq("id", egresadoId!);
        setNotifPush(false);
        toast.success("Notificaciones push desactivadas");
      }
    } finally { setPushBusy(false); }
  };

  const uploadCV = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("El archivo no debe pesar más de 5MB");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/cv.${ext}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (error) return toast.error("Error al subir CV");
    await supabase.from("egresados").update({ cv_url: path }).eq("id", egresadoId!);
    const { data: signed } = await supabase.storage.from("cvs").createSignedUrl(path, 3600);
    setCvPath(path);
    setCvUrl(signed?.signedUrl ?? null);
    toast.success("CV subido");
  };

  const removeCV = async () => {
    if (!cvPath || !egresadoId) return;
    await supabase.storage.from("cvs").remove([cvPath]);
    await supabase.from("egresados").update({ cv_url: null }).eq("id", egresadoId);
    setCvPath(null); setCvUrl(null);
    toast.success("CV eliminado");
  };

  if (loading) return <div className="text-center text-sm text-muted-foreground py-12">Cargando...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mi perfil" subtitle="Mantén tu información actualizada para mejorar tus oportunidades" />

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nombre completo"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} /></Field>
          <Field label="Teléfono"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} /></Field>
          <Field label="Matrícula"><input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={inputCls} /></Field>
          <Field label="Carrera">
            <select value={carrera} onChange={(e) => setCarrera(e.target.value)} className={inputCls}>
              <option value="">Selecciona tu carrera</option>
              {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Año de egreso"><input type="number" value={anioEgreso} onChange={(e) => setAnioEgreso(e.target.value)} className={inputCls} /></Field>
          <Field label="Ubicación"><input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Experiencia"><textarea value={experiencia} onChange={(e) => setExperiencia(e.target.value)} rows={4} className={inputCls} /></Field>
        <Field label="Habilidades (separadas por coma)"><input value={habilidades} onChange={(e) => setHabilidades(e.target.value)} placeholder="React, Excel, Liderazgo..." className={inputCls} /></Field>

        <label className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg cursor-pointer">
          <input type="checkbox" checked={notifEmail} onChange={(e) => setNotifEmail(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span className="text-sm">
            <span className="font-display font-medium text-foreground block">Recibir vacantes compatibles por correo</span>
            <span className="text-xs text-muted-foreground">Te avisaremos cuando se publique una vacante con al menos 65% de coincidencia con tu perfil.</span>
          </span>
        </label>

        <div className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
          {notifPush ? <Bell size={18} className="mt-0.5 text-primary" /> : <BellOff size={18} className="mt-0.5 text-muted-foreground" />}
          <div className="flex-1 text-sm">
            <span className="font-display font-medium text-foreground block">Notificaciones push (navegador / app instalada)</span>
            <span className="text-xs text-muted-foreground">Recibe avisos instantáneos cuando aparezca una vacante con ≥65% de coincidencia, incluso con la pestaña cerrada.</span>
            {!isPushSupported() && <span className="block text-xs text-destructive mt-1">Tu navegador no soporta push.</span>}
          </div>
          <button
            type="button"
            disabled={pushBusy || !isPushSupported()}
            onClick={() => togglePush(!notifPush)}
            className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-display font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {pushBusy ? "..." : notifPush ? "Desactivar" : "Activar"}
          </button>
        </div>

        <div>
          <label className="font-display text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">Currículum (PDF)</label>
          {cvUrl ? (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <FileText size={18} className="text-primary" />
              <a href={cvUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex-1">Ver CV actual</a>
              <button onClick={removeCV} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/30 text-sm text-muted-foreground">
              <Upload size={16} />
              <span>Subir CV (máx 5MB)</span>
              <input type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCV(e.target.files[0])} />
            </label>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 h-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-display text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
