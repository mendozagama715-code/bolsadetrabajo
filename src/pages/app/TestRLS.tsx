import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { friendlyError } from "@/lib/rls-error";
import { enqueueSupabaseAction, queueLength } from "@/lib/offline-queue";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, WifiOff } from "lucide-react";

interface Result {
  label: string;
  ok: boolean;
  detail: string;
  raw?: string;
}

export default function TestRLS() {
  const { role, user, session } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [qLen, setQLen] = useState<number>(0);

  const push = (r: Result) => setResults((prev) => [r, ...prev]);

  const refreshQ = async () => setQLen(await queueLength());

  const runTests = async () => {
    setRunning(true);
    setResults([]);

    // 1) Intentar leer TODOS los CVs de egresados (solo admin debería poder).
    {
      const { data, error } = await supabase.from("egresados").select("id,nombre_completo,cv_url").limit(50);
      push({
        label: "Leer todos los CVs de egresados",
        ok: !error && (data?.length ?? 0) > 1,
        detail: error ? friendlyError(error) : `Filas visibles: ${data?.length ?? 0}`,
        raw: error ? JSON.stringify(error) : `${data?.length ?? 0} filas`,
      });
    }

    // 2) Intentar crear una vacante (solo empresa aprobada).
    {
      const { error } = await supabase.from("vacantes").insert({
        empresa_id: "00000000-0000-0000-0000-000000000000",
        puesto: "TEST RLS - debería fallar",
        descripcion: "prueba",
        tipo_contrato: "tiempo_completo" as any,
      });
      push({
        label: "Crear vacante con empresa ajena",
        ok: !error,
        detail: error ? friendlyError(error) : "Insert permitido (inesperado)",
        raw: error ? JSON.stringify(error) : "ok",
      });
    }

    // 3) Intentar borrar una vacante ajena (id aleatorio).
    {
      const { error, count } = await supabase
        .from("vacantes")
        .delete({ count: "exact" })
        .eq("id", "00000000-0000-0000-0000-000000000000");
      push({
        label: "Borrar vacante ajena",
        ok: !error && (count ?? 0) > 0,
        detail: error ? friendlyError(error) : `Filas eliminadas: ${count ?? 0}`,
        raw: error ? JSON.stringify(error) : `count=${count ?? 0}`,
      });
    }

    // 4) Intentar leer postulaciones ajenas.
    {
      const { data, error } = await supabase.from("postulaciones").select("id,egresado_id,vacante_id").limit(50);
      push({
        label: "Leer postulaciones ajenas",
        ok: !error,
        detail: error ? friendlyError(error) : `Filas visibles: ${data?.length ?? 0} (solo deberían ser las propias)`,
        raw: `${data?.length ?? 0} filas`,
      });
    }

    // 5) Intentar autoasignarse rol admin (debería fallar por trigger + RLS).
    if (user) {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "admin" as any });
      push({
        label: "Autoasignarse rol 'admin'",
        ok: !error,
        detail: error ? friendlyError(error) : "Insert permitido (¡CRÍTICO!)",
        raw: error ? JSON.stringify(error) : "ok",
      });
    }

    setRunning(false);
  };

  const simularOffline = async () => {
    if (!session?.access_token) return toast.error("Sin sesión");
    await enqueueSupabaseAction({
      table: "vacantes",
      method: "POST",
      body: {
        empresa_id: "00000000-0000-0000-0000-000000000000",
        puesto: "OFFLINE TEST " + Date.now(),
        descripcion: "encolado desde test",
        tipo_contrato: "tiempo_completo",
      },
      label: "Vacante de prueba (offline)",
      accessToken: session.access_token,
    });
    await refreshQ();
    toast.success("Acción encolada. Se enviará al reconectar (o al volver 'online').");
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Prueba de seguridad (RLS)" subtitle={`Rol actual detectado: ${role ?? "sin rol"}`} />

      <div className="bg-card border border-border rounded-xl p-6 shadow-card space-y-4">
        <p className="text-sm text-muted-foreground">
          Esta pantalla ejecuta acciones que <strong>no deberían</strong> estar permitidas para tu rol. Sirve como
          evidencia de que la seguridad está aplicada en el servidor (Postgres RLS), no solo escondiendo botones en la
          interfaz.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={runTests}
            disabled={running}
            className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-display font-medium disabled:opacity-50"
          >
            {running ? "Ejecutando..." : "Ejecutar pruebas RLS"}
          </button>
          <button
            onClick={simularOffline}
            className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary inline-flex items-center gap-2"
          >
            <WifiOff size={16} /> Encolar acción (offline)
          </button>
          <button
            onClick={refreshQ}
            className="px-4 h-10 rounded-lg border border-border text-sm font-display hover:bg-secondary"
          >
            Ver cola ({qLen})
          </button>
        </div>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border flex items-start gap-3 ${r.ok ? "border-destructive/40 bg-destructive/5" : "border-emerald-500/40 bg-emerald-500/5"}`}
            >
              {r.ok ? (
                <ShieldAlert className="text-destructive shrink-0" />
              ) : (
                <ShieldCheck className="text-emerald-600 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-sm">{r.label}</div>
                <div className="text-sm mt-1">{r.detail}</div>
                <div className={`text-xs mt-1 ${r.ok ? "text-destructive" : "text-emerald-700"}`}>
                  {r.ok ? "❌ NO bloqueado — revisa políticas" : "✅ Bloqueado correctamente por el servidor"}
                </div>
                {r.raw && <pre className="text-[11px] mt-2 p-2 bg-muted rounded overflow-x-auto">{r.raw}</pre>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
