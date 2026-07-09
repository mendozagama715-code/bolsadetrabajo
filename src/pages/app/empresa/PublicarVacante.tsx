import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { friendlyError } from "@/lib/rls-error";
import { enqueueSupabaseAction } from "@/lib/offline-queue";

const inputCls = "w-full px-3 h-10 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const CARRERAS = [
  "Ingeniería en Desarrollo Sustentable con Orientación en Veterinaria y Zootecnia",
  "Ingeniería en Desarrollo Sustentable con Orientación en Eco-Biología",
  "Ingeniería en Tecnologías de la Información y Comunicaciones",
  "Ingeniería Agroindustrial",
  "Ingeniería en Sistemas Computacionales",
  "Licenciatura en Administración y Negocios",
];

export default function PublicarVacante() {
  const { empresaId } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    puesto: "", area: "", carrera_solicitada: "", ubicacion: "",
    tipo_contrato: "tiempo_completo", salario_min: "", salario_max: "",
    fecha_cierre: "", descripcion: "", requisitos: "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return toast.error("Sin empresa asociada");
    if (!f.puesto || !f.descripcion) return toast.error("Puesto y descripción son obligatorios");
    setSaving(true);
    const { data: nueva, error } = await supabase.from("vacantes").insert({
      empresa_id: empresaId,
      puesto: f.puesto,
      area: f.area || null,
      carrera_solicitada: f.carrera_solicitada || null,
      ubicacion: f.ubicacion || null,
      tipo_contrato: f.tipo_contrato as any,
      salario_min: f.salario_min ? parseFloat(f.salario_min) : null,
      salario_max: f.salario_max ? parseFloat(f.salario_max) : null,
      fecha_cierre: f.fecha_cierre || null,
      descripcion: f.descripcion,
      requisitos: f.requisitos || null,
    }).select("id").maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Vacante publicada");
    // Disparar notificaciones por correo a egresados compatibles (no bloquea la UI)
    if (nueva?.id) {
      supabase.functions.invoke("notificar-vacante-nueva", { body: { vacante_id: nueva.id } })
        .catch((e) => console.error("notif err", e));
    }
    navigate("/app/mis-vacantes");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Publicar nueva vacante" subtitle="Completa la información para que los egresados puedan postular" />
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Puesto *"><input required value={f.puesto} onChange={(e) => set("puesto", e.target.value)} className={inputCls} /></Field>
          <Field label="Área"><input value={f.area} onChange={(e) => set("area", e.target.value)} className={inputCls} /></Field>
          <Field label="Carrera solicitada">
            <select value={f.carrera_solicitada} onChange={(e) => set("carrera_solicitada", e.target.value)} className={inputCls}>
              <option value="">Cualquier carrera</option>
              {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Ubicación"><input value={f.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} className={inputCls} /></Field>
          <Field label="Tipo de contrato">
            <select value={f.tipo_contrato} onChange={(e) => set("tipo_contrato", e.target.value)} className={inputCls}>
              <option value="tiempo_completo">Tiempo completo</option>
              <option value="medio_tiempo">Medio tiempo</option>
              <option value="por_proyecto">Por proyecto</option>
              <option value="practicas">Prácticas</option>
            </select>
          </Field>
          <Field label="Fecha de cierre"><input type="date" value={f.fecha_cierre} onChange={(e) => set("fecha_cierre", e.target.value)} className={inputCls} /></Field>
          <Field label="Salario mínimo (MXN)"><input type="number" value={f.salario_min} onChange={(e) => set("salario_min", e.target.value)} className={inputCls} /></Field>
          <Field label="Salario máximo (MXN)"><input type="number" value={f.salario_max} onChange={(e) => set("salario_max", e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Descripción *"><textarea required rows={5} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} className={inputCls} /></Field>
        <Field label="Requisitos"><textarea rows={4} value={f.requisitos} onChange={(e) => set("requisitos", e.target.value)} className={inputCls} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary">Cancelar</button>
          <button type="submit" disabled={saving} className="px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Publicando..." : "Publicar vacante"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-display text-xs font-semibold text-foreground uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
