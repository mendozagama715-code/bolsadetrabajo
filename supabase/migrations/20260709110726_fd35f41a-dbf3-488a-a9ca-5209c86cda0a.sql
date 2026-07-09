
-- 1) profiles: restrict SELECT
DROP POLICY IF EXISTS "Profiles visibles para autenticados" ON public.profiles;

CREATE POLICY "Usuario ve su propio perfil"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Empresa puede ver perfil de egresados que postularon a sus vacantes
CREATE POLICY "Empresa ve perfil de postulantes"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.postulaciones p
    JOIN public.vacantes v ON v.id = p.vacante_id
    JOIN public.egresados e ON e.id = p.egresado_id
    WHERE e.user_id = profiles.user_id
      AND v.empresa_id = public.get_empresa_id_for_user(auth.uid())
  )
);

-- Egresado puede ver perfil del responsable de la empresa a la que postuló
CREATE POLICY "Egresado ve perfil de empresa postulada"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.postulaciones p
    JOIN public.vacantes v ON v.id = p.vacante_id
    JOIN public.empresas em ON em.id = v.empresa_id
    WHERE em.user_id = profiles.user_id
      AND p.egresado_id = public.get_egresado_id_for_user(auth.uid())
  )
);

-- 2) egresados: empresa sólo ve egresados que postularon a sus vacantes
DROP POLICY IF EXISTS "Empresa ve egresados aprobados que postulan" ON public.egresados;

CREATE POLICY "Empresa ve egresados aprobados que postulan"
ON public.egresados FOR SELECT TO authenticated
USING (
  estado = 'aprobado'::estado_validacion
  AND public.has_role(auth.uid(), 'empresa'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.postulaciones p
    JOIN public.vacantes v ON v.id = p.vacante_id
    WHERE p.egresado_id = egresados.id
      AND v.empresa_id = public.get_empresa_id_for_user(auth.uid())
  )
);

-- 3) user_roles: bloquear autoasignación de admin/super_admin desde el cliente
DROP POLICY IF EXISTS "Admin crea roles administrativos" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.enforce_role_creation_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin'::app_role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo un super administrador puede crear otro super administrador';
    END IF;
  ELSIF NEW.role = 'admin'::app_role THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.is_super_admin(auth.uid())
       AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Solo un administrador puede crear otro administrador';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_creation_rules_trg ON public.user_roles;
CREATE TRIGGER enforce_role_creation_rules_trg
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_role_creation_rules();

-- 4) Storage: eliminar listado público de bucket logos
DROP POLICY IF EXISTS "Logos públicos" ON storage.objects;

-- 5) search_path para funciones pgmq y revocar acceso público
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- Revocar EXECUTE de funciones SECURITY DEFINER que no deben ser llamadas desde el cliente
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
