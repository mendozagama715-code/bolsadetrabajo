CREATE OR REPLACE FUNCTION public.enforce_role_creation_rules()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin'::app_role THEN
    -- Permitir cuando no hay sesión (operaciones administrativas internas / service role)
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo un super administrador puede crear otro super administrador';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;