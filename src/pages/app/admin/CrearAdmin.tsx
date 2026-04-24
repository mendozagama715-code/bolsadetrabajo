import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

const schema = z
  .object({
    nombre: z.string().trim().min(2, "Nombre requerido").max(120),
    email: z.string().trim().email("Correo inválido").max(255),
    password: z.string().min(8, "Mínimo 8 caracteres").max(128),
    password_confirmation: z.string(),
    rol: z.enum(["admin", "super_admin"]),
  })
  .refine((d) => d.password === d.password_confirmation, {
    path: ["password_confirmation"],
    message: "Las contraseñas no coinciden",
  });

export default function CrearAdmin() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    password_confirmation: "",
    rol: "admin" as "admin" | "super_admin",
  });

  const reset = () =>
    setForm({ nombre: "", email: "", password: "", password_confirmation: "", rol: "admin" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    if (r.data.rol === "super_admin" && role !== "super_admin") {
      toast.error("Solo un super administrador puede crear otro super administrador");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-admin", { body: r.data });
    setLoading(false);
    if (error) {
      const msg = (data as any)?.error || error.message || "No se pudo crear";
      if (msg.toLowerCase().includes("permis")) toast.error("No tienes permisos");
      else toast.error(msg);
      return;
    }
    toast.success("Administrador creado con éxito");
    reset();
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="Crear administrador" subtitle="Alta de cuentas con privilegios administrativos." />

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-card">
        <div className="space-y-1.5">
          <Label>Nombre completo</Label>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del administrador" />
        </div>
        <div className="space-y-1.5">
          <Label>Correo electrónico</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@uiestpuebla.edu.mx" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Contraseña</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar contraseña</Label>
            <Input type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} placeholder="Repite la contraseña" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Tipo de cuenta</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              ["admin", "Administrador", ShieldCheck],
              ["super_admin", "Super administrador", ShieldAlert],
            ] as const).map(([r, lbl, Icon]) => {
              const disabled = r === "super_admin" && role !== "super_admin";
              const active = form.rol === r;
              return (
                <button
                  type="button"
                  key={r}
                  disabled={disabled}
                  onClick={() => setForm({ ...form, rol: r })}
                  className={`border-[1.5px] rounded-lg p-3 text-left transition ${
                    active ? "border-primary bg-secondary" : "border-border hover:border-primary/40"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={active ? "text-primary" : "text-muted-foreground"} />
                    <span className={`font-display text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{lbl}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {role !== "super_admin" && (
            <p className="text-[11px] text-muted-foreground">Solo el super administrador puede crear otros super administradores.</p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" size={16} />} Crear administrador
        </Button>
      </form>
    </div>
  );
}
