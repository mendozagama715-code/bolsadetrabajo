
CREATE TYPE public.tipo_notificacion AS ENUM ('info','exito','advertencia','error');

CREATE TABLE public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  tipo public.tipo_notificacion NOT NULL DEFAULT 'info',
  enlace text,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user ON public.notificaciones(user_id, leida, created_at DESC);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus notificaciones"
  ON public.notificaciones FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuario marca sus notificaciones"
  ON public.notificaciones FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin gestiona notificaciones"
  ON public.notificaciones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
ALTER TABLE public.notificaciones REPLICA IDENTITY FULL;
