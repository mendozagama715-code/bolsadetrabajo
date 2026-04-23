
-- Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;

-- ============ CVs (privado) ============
-- Egresado sube/ve/edita su CV (path: {user_id}/archivo.pdf)
CREATE POLICY "Egresado ve su CV"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Egresado sube su CV"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Egresado actualiza su CV"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Egresado elimina su CV"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Empresa ve CV de egresados que postularon a sus vacantes
CREATE POLICY "Empresa ve CV de postulantes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cvs' AND EXISTS (
    SELECT 1
    FROM public.postulaciones p
    JOIN public.vacantes v ON v.id = p.vacante_id
    JOIN public.egresados e ON e.id = p.egresado_id
    WHERE v.empresa_id = public.get_empresa_id_for_user(auth.uid())
      AND e.user_id::text = (storage.foldername(name))[1]
  )
);

-- Admin total
CREATE POLICY "Admin ve CVs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'cvs' AND public.has_role(auth.uid(), 'admin'));

-- ============ Logos (público lectura) ============
CREATE POLICY "Logos públicos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Empresa sube su logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Empresa actualiza su logo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Empresa elimina su logo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);
