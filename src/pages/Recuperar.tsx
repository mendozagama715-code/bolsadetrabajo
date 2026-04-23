import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav, Footer } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock, Mail, Loader2, CheckCircle2 } from "lucide-react";

const schema = z.object({ email: z.string().email("Correo inválido").max(255) });

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ email });
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(r.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <div className="flex-1 flex">
        <aside className="hidden md:flex w-[38%] bg-primary text-primary-foreground items-center justify-center p-10">
          <div className="max-w-xs text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-crema/15 border-2 border-crema/30 flex items-center justify-center">
              <Lock className="text-crema" size={28} />
            </div>
            <h2 className="font-display text-xl font-bold">Recuperar acceso</h2>
            <p className="text-crema/85 text-sm">Te ayudaremos a recuperar el acceso a tu cuenta de forma segura.</p>
            <div className="space-y-2 pt-3 text-left">
              {["Ingresa tu correo electrónico", "Recibe un enlace seguro", "Crea tu nueva contraseña"].map((t, i) => (
                <div key={t} className="flex items-center gap-3 bg-white/10 rounded-lg p-2.5">
                  <span className="w-6 h-6 rounded-full bg-crema text-vino-dark text-[11px] font-bold font-display flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs text-crema/90">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8 shadow-card animate-fade-in">
            {!sent ? (
              <>
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Mail className="text-primary" size={22} />
                </div>
                <h1 className="font-display text-xl font-bold">Recuperar contraseña</h1>
                <p className="text-sm text-muted-foreground mt-1 mb-5">Ingresa tu correo y te enviaremos un enlace.</p>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@correo.com" />
                  </div>
                  <div className="text-[12px] bg-info/10 border-l-2 border-info text-info-foreground/90 rounded-r p-2.5">
                    El enlace de recuperación es válido por 30 minutos.
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="animate-spin" size={16} />} Enviar enlace
                  </Button>
                  <Link to="/auth" className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground hover:text-primary transition">
                    <ArrowLeft size={14} /> Regresar al inicio de sesión
                  </Link>
                </form>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-4">
                  <CheckCircle2 className="text-success" size={32} />
                </div>
                <h2 className="font-display text-lg font-bold">¡Correo enviado!</h2>
                <p className="text-sm text-muted-foreground mt-2 mb-5">
                  Hemos enviado un enlace de recuperación a <span className="text-primary font-medium">{email}</span>.
                </p>
                <Link to="/auth"><Button className="w-full">Volver al inicio de sesión</Button></Link>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
