-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('egresado', 'empresa', 'admin');
CREATE TYPE public.estado_validacion AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE public.estado_vacante AS ENUM ('activa', 'cerrada');
CREATE TYPE public.tipo_contrato AS ENUM ('tiempo_completo', 'medio_tiempo', 'por_proyecto', 'practicas');
CREATE TYPE public.estado_postulacion AS ENUM ('pendiente', 'en_revision', 'entrevista', 'contratado', 'rechazado');
CREATE TYPE public.tipo_evento AS ENUM ('contacto', 'entrevista', 'contratacion', 'otro');

-- ============ FUNCIONES UTILITARIAS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  telefono TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer para evitar recursión en RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ EGRESADOS ============
CREATE TABLE public.egresados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  matricula TEXT,
  carrera TEXT,
  anio_egreso INT,
  cv_url TEXT,
  experiencia TEXT,
  habilidades TEXT[],
  ubicacion TEXT,
  estado public.estado_validacion NOT NULL DEFAULT 'pendiente',
  motivo_rechazo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.egresados ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_egresados_updated_at
  BEFORE UPDATE ON public.egresados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EMPRESAS ============
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  razon_social TEXT NOT NULL,
  rfc TEXT NOT NULL,
  giro TEXT,
  direccion TEXT,
  sitio_web TEXT,
  descripcion TEXT,
  responsable TEXT,
  logo_url TEXT,
  estado public.estado_validacion NOT NULL DEFAULT 'pendiente',
  motivo_rechazo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_empresas_estado ON public.empresas(estado);

CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VACANTES ============
CREATE TABLE public.vacantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  puesto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  requisitos TEXT,
  area TEXT,
  tipo_contrato public.tipo_contrato NOT NULL DEFAULT 'tiempo_completo',
  salario_min NUMERIC,
  salario_max NUMERIC,
  ubicacion TEXT,
  carrera_solicitada TEXT,
  estado public.estado_vacante NOT NULL DEFAULT 'activa',
  fecha_cierre DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_vacantes_empresa ON public.vacantes(empresa_id);
CREATE INDEX idx_vacantes_estado ON public.vacantes(estado);

CREATE TRIGGER trg_vacantes_updated_at
  BEFORE UPDATE ON public.vacantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ POSTULACIONES ============
CREATE TABLE public.postulaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacante_id UUID NOT NULL REFERENCES public.vacantes(id) ON DELETE CASCADE,
  egresado_id UUID NOT NULL REFERENCES public.egresados(id) ON DELETE CASCADE,
  estado public.estado_postulacion NOT NULL DEFAULT 'pendiente',
  mensaje TEXT,
  notas_empresa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vacante_id, egresado_id)
);

ALTER TABLE public.postulaciones ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_post_vacante ON public.postulaciones(vacante_id);
CREATE INDEX idx_post_egresado ON public.postulaciones(egresado_id);

CREATE TRIGGER trg_postulaciones_updated_at
  BEFORE UPDATE ON public.postulaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ EVENTOS SEGUIMIENTO ============
CREATE TABLE public.eventos_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  postulacion_id UUID REFERENCES public.postulaciones(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo public.tipo_evento NOT NULL DEFAULT 'otro',
  fecha DATE NOT NULL,
  hora TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_seguimiento ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_eventos_empresa ON public.eventos_seguimiento(empresa_id);
CREATE INDEX idx_eventos_fecha ON public.eventos_seguimiento(fecha);

CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON public.eventos_seguimiento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.get_empresa_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.empresas WHERE user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_egresado_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.egresados WHERE user_id = _user_id LIMIT 1;
$$;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Profiles visibles para autenticados" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario edita su perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario crea su perfil" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin gestiona perfiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Usuario ve sus roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuario crea su rol al registrarse" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND role IN ('egresado','empresa'));
CREATE POLICY "Admin gestiona roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- egresados
CREATE POLICY "Egresado ve su registro" ON public.egresados
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Empresa ve egresados aprobados que postulan" ON public.egresados
  FOR SELECT TO authenticated USING (
    estado = 'aprobado' AND public.has_role(auth.uid(), 'empresa')
  );
CREATE POLICY "Egresado crea su registro" ON public.egresados
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Egresado actualiza su registro" ON public.egresados
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin gestiona egresados" ON public.egresados
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- empresas
CREATE POLICY "Empresa ve su registro" ON public.empresas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Empresas aprobadas visibles" ON public.empresas
  FOR SELECT TO authenticated USING (estado = 'aprobado');
CREATE POLICY "Empresa crea su registro" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Empresa actualiza su registro" ON public.empresas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin gestiona empresas" ON public.empresas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- vacantes
CREATE POLICY "Cualquier autenticado ve vacantes activas" ON public.vacantes
  FOR SELECT TO authenticated USING (
    estado = 'activa' OR
    empresa_id = public.get_empresa_id_for_user(auth.uid()) OR
    public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Empresa aprobada crea vacantes" ON public.vacantes
  FOR INSERT TO authenticated WITH CHECK (
    empresa_id = public.get_empresa_id_for_user(auth.uid())
    AND EXISTS (SELECT 1 FROM public.empresas WHERE id = empresa_id AND estado = 'aprobado')
  );
CREATE POLICY "Empresa edita sus vacantes" ON public.vacantes
  FOR UPDATE TO authenticated USING (empresa_id = public.get_empresa_id_for_user(auth.uid()));
CREATE POLICY "Empresa elimina sus vacantes" ON public.vacantes
  FOR DELETE TO authenticated USING (empresa_id = public.get_empresa_id_for_user(auth.uid()));
CREATE POLICY "Admin gestiona vacantes" ON public.vacantes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- postulaciones
CREATE POLICY "Egresado ve sus postulaciones" ON public.postulaciones
  FOR SELECT TO authenticated USING (egresado_id = public.get_egresado_id_for_user(auth.uid()));
CREATE POLICY "Empresa ve postulaciones a sus vacantes" ON public.postulaciones
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vacantes v
      WHERE v.id = vacante_id AND v.empresa_id = public.get_empresa_id_for_user(auth.uid())
    )
  );
CREATE POLICY "Egresado aprobado postula" ON public.postulaciones
  FOR INSERT TO authenticated WITH CHECK (
    egresado_id = public.get_egresado_id_for_user(auth.uid())
    AND EXISTS (SELECT 1 FROM public.egresados WHERE id = egresado_id AND estado = 'aprobado')
  );
CREATE POLICY "Empresa actualiza postulaciones a sus vacantes" ON public.postulaciones
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.vacantes v
      WHERE v.id = vacante_id AND v.empresa_id = public.get_empresa_id_for_user(auth.uid())
    )
  );
CREATE POLICY "Egresado retira su postulacion" ON public.postulaciones
  FOR DELETE TO authenticated USING (egresado_id = public.get_egresado_id_for_user(auth.uid()));
CREATE POLICY "Admin gestiona postulaciones" ON public.postulaciones
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- eventos_seguimiento
CREATE POLICY "Empresa ve sus eventos" ON public.eventos_seguimiento
  FOR SELECT TO authenticated USING (empresa_id = public.get_empresa_id_for_user(auth.uid()));
CREATE POLICY "Empresa crea eventos" ON public.eventos_seguimiento
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_empresa_id_for_user(auth.uid()));
CREATE POLICY "Empresa edita eventos" ON public.eventos_seguimiento
  FOR UPDATE TO authenticated USING (empresa_id = public.get_empresa_id_for_user(auth.uid()));
CREATE POLICY "Empresa borra eventos" ON public.eventos_seguimiento
  FOR DELETE TO authenticated USING (empresa_id = public.get_empresa_id_for_user(auth.uid()));
CREATE POLICY "Admin ve eventos" ON public.eventos_seguimiento
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGER: crear profile automático al registrarse ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nombre, telefono)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    NEW.raw_user_meta_data->>'telefono'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();