import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Convierte un error de Supabase (RLS, validación, red) en un mensaje claro
 * para el usuario final. Códigos PostgREST relevantes:
 *   42501 -> permission denied (RLS bloqueó la operación)
 *   PGRST301 -> JWT inválido/expirado
 *   23505 -> unique_violation
 */
export function friendlyError(err: PostgrestError | Error | null | undefined, fallback = "Ocurrió un error"): string {
  if (!err) return fallback;
  const anyErr = err as any;
  const code = anyErr.code as string | undefined;
  const msg = (anyErr.message as string) || "";

  if (code === "42501" || /row-level security|permission denied|not allowed/i.test(msg)) {
    return "No tienes permiso para realizar esta acción.";
  }
  if (code === "PGRST301") return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (code === "23505") return "Ya existe un registro con esos datos.";
  if (/failed to fetch|network/i.test(msg)) return "Sin conexión. La acción se guardó y se enviará cuando vuelvas a estar en línea.";
  return msg || fallback;
}
