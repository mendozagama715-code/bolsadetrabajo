import { supabase } from "@/integrations/supabase/client";

export type NotifTipo = "info" | "exito" | "advertencia" | "error";

export async function crearNotificacion(params: {
  user_id: string;
  titulo: string;
  mensaje: string;
  tipo?: NotifTipo;
  enlace?: string;
}) {
  const { error } = await supabase.from("notificaciones").insert({
    user_id: params.user_id,
    titulo: params.titulo,
    mensaje: params.mensaje,
    tipo: params.tipo ?? "info",
    enlace: params.enlace ?? null,
  });
  if (error) console.error("notificación:", error);
}
