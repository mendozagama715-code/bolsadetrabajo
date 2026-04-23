import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PublicNav, Footer } from "@/components/PublicNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({ password: z.string().min(6, "Mínimo 6 caracteres").max(128) });

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ password });
    if (!r.success) { toast.error(r.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: r.data.password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada");
    navigate("/app");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8 shadow-card">
          <h1 className="font-display text-xl font-bold mb-1">Nueva contraseña</h1>
          <p className="text-sm text-muted-foreground mb-5">Ingresa tu nueva contraseña.</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nueva contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="animate-spin" size={16} />} Actualizar contraseña
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
