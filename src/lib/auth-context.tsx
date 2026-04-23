import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "egresado" | "empresa" | "admin";

interface ProfileLite {
  nombre: string | null;
  avatar_url: string | null;
}

interface RoleStatus {
  estado?: "pendiente" | "aprobado" | "rechazado" | null;
  motivo_rechazo?: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: AppRole | null;
  profile: ProfileLite | null;
  status: RoleStatus | null;
  empresaId: string | null;
  egresadoId: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [status, setStatus] = useState<RoleStatus | null>(null);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [egresadoId, setEgresadoId] = useState<string | null>(null);

  const loadUserData = async (uid: string) => {
    const [profRes, rolesRes, egRes, emRes] = await Promise.all([
      supabase.from("profiles").select("nombre,avatar_url").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("egresados").select("id,estado,motivo_rechazo").eq("user_id", uid).maybeSingle(),
      supabase.from("empresas").select("id,estado,motivo_rechazo").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile(profRes.data ?? null);
    const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
    // Prioridad: admin > empresa > egresado
    const r: AppRole | null = roles.includes("admin")
      ? "admin"
      : roles.includes("empresa")
      ? "empresa"
      : roles.includes("egresado")
      ? "egresado"
      : null;
    setRole(r);
    setEgresadoId(egRes.data?.id ?? null);
    setEmpresaId(emRes.data?.id ?? null);
    if (r === "egresado") setStatus(egRes.data ? { estado: egRes.data.estado, motivo_rechazo: egRes.data.motivo_rechazo } : null);
    else if (r === "empresa") setStatus(emRes.data ? { estado: emRes.data.estado, motivo_rechazo: emRes.data.motivo_rechazo } : null);
    else setStatus({ estado: "aprobado" });
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer fetch to avoid deadlock
        setTimeout(() => { loadUserData(sess.user.id); }, 0);
      } else {
        setRole(null); setProfile(null); setStatus(null);
        setEgresadoId(null); setEmpresaId(null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await loadUserData(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (user) await loadUserData(user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ session, user, loading, role, profile, status, empresaId, egresadoId, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
};
