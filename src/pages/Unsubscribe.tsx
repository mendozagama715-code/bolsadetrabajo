import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "ready" | "done" | "already" | "invalid" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [sp] = useSearchParams();
  const token = sp.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: ANON },
        });
        const j = await r.json();
        if (j?.already_unsubscribed) { setEmail(j.email ?? null); setState("already"); }
        else if (j?.valid) { setEmail(j.email ?? null); setState("ready"); }
        else setState("invalid");
      } catch { setState("error"); }
    })();
  }, [token]);

  const confirm = async () => {
    setState("loading");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Bolsa de Trabajo UICH</h1>
        {state === "loading" && <p className="text-muted-foreground">Procesando…</p>}
        {state === "ready" && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              ¿Quieres dar de baja <span className="font-semibold text-foreground">{email}</span> de los correos de vacantes?
            </p>
            <button onClick={confirm} className="px-6 h-11 rounded-lg bg-primary text-primary-foreground font-display font-medium hover:bg-primary/90">
              Confirmar baja
            </button>
          </>
        )}
        {state === "done" && <p className="text-sm">Listo. Ya no recibirás más correos de vacantes.</p>}
        {state === "already" && <p className="text-sm text-muted-foreground">Este correo ya estaba dado de baja.</p>}
        {state === "invalid" && <p className="text-sm text-destructive">Enlace inválido o expirado.</p>}
        {state === "error" && <p className="text-sm text-destructive">Ocurrió un error. Intenta de nuevo.</p>}
      </div>
    </div>
  );
}
