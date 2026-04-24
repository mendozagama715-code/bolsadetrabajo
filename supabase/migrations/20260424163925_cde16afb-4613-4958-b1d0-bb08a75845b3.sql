-- Función: ¿es super_admin?
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  )
$$;

-- Política para que admin/super_admin inserten roles administrativos
DROP POLICY IF EXISTS "Admin crea roles administrativos" ON public.user_roles;
CREATE POLICY "Admin crea roles administrativos"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
  AND role IN ('admin'::app_role, 'super_admin'::app_role)
);

-- Trigger: solo super_admin puede crear super_admin
CREATE OR REPLACE FUNCTION public.enforce_role_creation_rules()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin'::app_role THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo un super administrador puede crear otro super administrador';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_role_creation ON public.user_roles;
CREATE TRIGGER trg_enforce_role_creation
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_role_creation_rules();

-- Trigger: proteger al último super_admin
CREATE OR REPLACE FUNCTION public.protect_last_super_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE remaining int;
BEGIN
  IF OLD.role = 'super_admin'::app_role THEN
    SELECT COUNT(*) INTO remaining
    FROM public.user_roles
    WHERE role = 'super_admin'::app_role AND id <> OLD.id;
    IF remaining = 0 THEN
      RAISE EXCEPTION 'No puedes eliminar al último super administrador';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_last_super_admin ON public.user_roles;
CREATE TRIGGER trg_protect_last_super_admin
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_last_super_admin();

-- Trigger de auto-creación de profile (faltaba)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();