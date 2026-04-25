import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PublicNav, Footer } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Building2, ShieldCheck, Loader2 } from "lucide-react";

type Tab = "login" | "signup";
type Rol = "egresado" | "empresa" | "admin";

const loginSchema = z.object({
  email: z.string().email("Correo inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

const signupSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre requerido").max(120),
  email: z.string().email("Correo inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
  confirm: z.string().optional(),
  rfc: z.string().trim().max(20).optional(),
});

export default function Auth() {
  const [tab, setTab] = useState<Tab>("login");
  const [rol, setRol] = useState<Rol>("egresado");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { role: currentRole } = useAuth();
  const canCreateAdmin = currentRole === "admin" || currentRole === "super_admin";

  const [li, setLi] = useState({ email: "", password: "" });
  const [su, setSu] = useState({ nombre: "", email: "", password: "", confirm: "", rfc: "", area: "", access_code: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = loginSchema.safeParse(li);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bienvenido");
    navigate("/app");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = signupSchema.safeParse(su);
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    if (rol === "empresa" && !r.data.rfc) { toast.error("RFC requerido para empresas"); return; }

    // === Rama administrador (POST a edge function /create-admin) ===
    if (rol === "admin") {
      if (r.data.password.length < 8) { toast.error("Mínimo 8 caracteres para administrador"); return; }
      if (r.data.password !== su.confirm) { toast.error("Las contraseñas no coinciden"); return; }
      if (!canCreateAdmin) {
        if (!su.access_code.trim()) { toast.error("Ingresa el código de acceso institucional"); return; }
        if (!su.area.trim()) { toast.error("Indica el área / departamento"); return; }
      }
      setLoading(true);
      const { data: resp, error } = await supabase.functions.invoke("create-admin", {
        body: {
          nombre: r.data.nombre,
          email: r.data.email,
          password: r.data.password,
          password_confirmation: su.confirm,
          rol: "admin",
          area: su.area,
          access_code: canCreateAdmin ? "" : su.access_code,
        },
      });
      setLoading(false);
      if (error) {
        const msg = (resp as any)?.error || error.message;
        toast.error(msg ?? "No se pudo crear");
        return;
      }
      toast.success("Cuenta de administrador creada. Inicia sesión.");
      setSu({ nombre: "", email: "", password: "", confirm: "", rfc: "", area: "", access_code: "" });
      setTab("login");
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/app`;
    const { data, error } = await supabase.auth.signUp({
      email: r.data.email,
      password: r.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nombre: r.data.nombre },
      },
    });
    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message ?? "No se pudo crear la cuenta");
      return;
    }

    // crear rol + registro de egresado/empresa
    const uid = data.user.id;
    const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: uid, role: rol });
    if (roleErr) console.error(roleErr);

    if (rol === "egresado") {
      await supabase.from("egresados").insert({ user_id: uid });
    } else {
      await supabase.from("empresas").insert({
        user_id: uid,
        razon_social: r.data.nombre,
        rfc: r.data.rfc!,
      });
    }

    setLoading(false);
    toast.success("Cuenta creada. Tu registro está pendiente de validación.");
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <div className="flex-1 flex">
        {/* Panel izquierdo */}
        <aside className="hidden md:flex w-[38%] bg-primary text-primary-foreground items-center justify-center p-10">
          <div className="max-w-sm text-center space-y-4">
            <h2 className="font-display text-2xl font-semibold">Bolsa de Trabajo UIEPCh</h2>
            <p className="text-crema/90 text-sm leading-relaxed">
              Conectamos egresados con empresas de la región serrana de Puebla.
            </p>
            <div className="space-y-2 pt-6 text-left">
              {[
                "Para egresados de la UIEPCh",
                "Para empresas verificadas de la región",
                "Validación por la coordinación universitaria",
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 bg-white/10 rounded-lg p-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-crema" />
                  <span className="text-xs text-crema/90">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel derecho - card */}
        <section className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-7 shadow-card animate-fade-in">
            <div className="flex border-b border-border mb-5 -mt-1">
              {(["login", "signup"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 font-display text-sm font-medium transition border-b-2 -mb-px ${
                    tab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent"
                  }`}
                >
                  {t === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <h3 className="font-display text-lg font-semibold">Bienvenido</h3>
                <p className="text-sm text-muted-foreground -mt-2">Ingresa tus credenciales para continuar</p>
                <div className="space-y-1.5">
                  <Label htmlFor="le">Correo electrónico</Label>
                  <Input id="le" type="email" placeholder="ejemplo@correo.com"
                    value={li.email} onChange={(e) => setLi({ ...li, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp">Contraseña</Label>
                  <Input id="lp" type="password" placeholder="••••••••"
                    value={li.password} onChange={(e) => setLi({ ...li, password: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="animate-spin" size={16} />} Iniciar sesión
                </Button>
                <div className="text-xs text-center text-muted-foreground">
                  ¿Olvidaste tu contraseña? <Link to="/recuperar" className="text-primary underline">Recupérala aquí</Link>
                </div>
                <div className="text-[11px] bg-secondary border-l-2 border-primary text-foreground/80 rounded-r p-2.5">
                  Administradores: usan correo institucional. No aparecen en el registro público.
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3.5">
                <h3 className="font-display text-lg font-semibold">Crear cuenta</h3>
                <p className="text-sm text-muted-foreground -mt-2">
                  ¿Eres egresado, empresa o administrador?
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      ["egresado", "Egresado", GraduationCap],
                      ["empresa", "Empresa", Building2],
                      ["admin", "Administrador", ShieldCheck],
                    ] as const
                  ).map(([r, lbl, Icon]) => (
                    <button type="button" key={r} onClick={() => setRol(r as Rol)}
                      className={`border-[1.5px] rounded-lg p-3 transition ${
                        rol === r ? "border-primary bg-secondary" : "border-border hover:border-primary/40"
                      }`}>
                      <div className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center mb-1.5 ${
                        rol === r ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className={`font-display text-xs font-medium ${rol === r ? "text-primary" : "text-muted-foreground"}`}>{lbl}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label>
                    {rol === "empresa" ? "Razón social" : "Nombre completo"}
                  </Label>
                  <Input value={su.nombre} onChange={(e) => setSu({ ...su, nombre: e.target.value })}
                    placeholder={rol === "empresa" ? "Empresa S.A. de C.V." : "Tu nombre completo"} />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo electrónico</Label>
                  <Input type="email" value={su.email} onChange={(e) => setSu({ ...su, email: e.target.value })}
                    placeholder="ejemplo@correo.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contraseña</Label>
                  <Input type="password" value={su.password} onChange={(e) => setSu({ ...su, password: e.target.value })}
                    placeholder={rol === "admin" ? "Mínimo 8 caracteres" : "••••••••"} />
                </div>
                {rol === "admin" && (
                  <div className="space-y-1.5">
                    <Label>Confirmar contraseña</Label>
                    <Input type="password" value={su.confirm} onChange={(e) => setSu({ ...su, confirm: e.target.value })}
                      placeholder="Repite la contraseña" />
                  </div>
                )}
                {rol === "empresa" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>RFC</Label>
                      <Input value={su.rfc} onChange={(e) => setSu({ ...su, rfc: e.target.value.toUpperCase() })}
                        placeholder="RFC de la empresa" />
                    </div>
                    <div className="text-[11px] bg-warning/15 border-l-2 border-warning text-warning-foreground rounded-r p-2.5">
                      Tu cuenta quedará pendiente de validación antes de publicar vacantes.
                    </div>
                  </>
                )}
                {rol === "egresado" && (
                  <div className="text-[11px] bg-warning/15 border-l-2 border-warning text-warning-foreground rounded-r p-2.5">
                    Tu cuenta queda pendiente de validación por el administrador antes de postularte.
                  </div>
                )}
                {rol === "admin" && (
                  <div className="text-[11px] bg-secondary border-l-2 border-primary text-foreground/80 rounded-r p-2.5">
                    Estás creando una cuenta administrativa. La cuenta queda activa de inmediato.
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="animate-spin" size={16} />}{" "}
                  {rol === "admin" ? "Crear administrador" : "Crear cuenta"}
                </Button>
              </form>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
