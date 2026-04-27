import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PendingApproval } from "./PendingApproval";

interface Stat { label: string; value: string | number; accent?: boolean; to?: string; }

export default function Dashboard() {
  const { role, profile, status, egresadoId, empresaId } = useAuth();
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    const load = async () => {
      if (role === "egresado") {
        const [vac, post, proc] = await Promise.all([
          supabase.from("vacantes").select("id", { count: "exact", head: true }).eq("estado", "activa"),
          egresadoId ? supabase.from("postulaciones").select("id", { count: "exact", head: true }).eq("egresado_id", egresadoId) : Promise.resolve({ count: 0 } as any),
          egresadoId ? supabase.from("postulaciones").select("id", { count: "exact", head: true }).eq("egresado_id", egresadoId).in("estado", ["en_revision","proceso"]) : Promise.resolve({ count: 0 } as any),
        ]);
        setStats([
          { label: "Vacantes disponibles", value: vac.count ?? 0, accent: true, to: "/app/vacantes" },
          { label: "Mis postulaciones", value: post.count ?? 0, to: "/app/postulaciones" },
          { label: "En proceso", value: proc.count ?? 0, to: "/app/postulaciones" },
          { label: "Estado de cuenta", value: status?.estado === "aprobado" ? "Activa" : "Pendiente", accent: true, to: "/app/perfil" },
        ]);
      } else if (role === "empresa") {
        if (!empresaId) return;
        const [vac, postul, proc, contr] = await Promise.all([
          supabase.from("vacantes").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId).eq("estado", "activa"),
          supabase.from("postulaciones").select("id, vacantes!inner(empresa_id)", { count: "exact", head: true }).eq("vacantes.empresa_id", empresaId),
          supabase.from("postulaciones").select("id, vacantes!inner(empresa_id)", { count: "exact", head: true }).eq("vacantes.empresa_id", empresaId).in("estado", ["en_revision","proceso"]),
          supabase.from("postulaciones").select("id, vacantes!inner(empresa_id)", { count: "exact", head: true }).eq("vacantes.empresa_id", empresaId).eq("estado", "contratado"),
        ]);
        setStats([
          { label: "Vacantes activas", value: vac.count ?? 0, accent: true, to: "/app/mis-vacantes" },
          { label: "Total postulantes", value: postul.count ?? 0, to: "/app/postulantes" },
          { label: "En proceso", value: proc.count ?? 0, to: "/app/postulantes" },
          { label: "Contratados", value: contr.count ?? 0, accent: true, to: "/app/postulantes" },
        ]);
      } else if (role === "admin") {
        const [eg, em, vac, post] = await Promise.all([
          supabase.from("egresados").select("id", { count: "exact", head: true }),
          supabase.from("empresas").select("id", { count: "exact", head: true }).eq("estado", "aprobado"),
          supabase.from("vacantes").select("id", { count: "exact", head: true }).eq("estado", "activa"),
          supabase.from("postulaciones").select("id", { count: "exact", head: true }),
        ]);
        setStats([
          { label: "Egresados registrados", value: eg.count ?? 0, accent: true, to: "/app/admin/usuarios" },
          { label: "Empresas verificadas", value: em.count ?? 0, to: "/app/admin/empresas" },
          { label: "Vacantes activas", value: vac.count ?? 0, accent: true, to: "/app/admin/vacantes" },
          { label: "Postulaciones totales", value: post.count ?? 0, to: "/app/admin/reportes" },
        ]);
      }
    };
    load();
  }, [role, egresadoId, empresaId, status]);

  // Si está pendiente o rechazado, mostramos pantalla específica
  if (role !== "admin" && status?.estado !== "aprobado") {
    return <PendingApproval />;
  }

  const titulo =
    role === "admin" ? "Panel de administración" :
    role === "empresa" ? "Dashboard Empresa" :
    `Bienvenido, ${profile?.nombre?.split(" ")[0] ?? ""}`;
  const subtitulo =
    role === "admin" ? "Resumen general de la Bolsa de Trabajo UIEPCh" :
    role === "empresa" ? "Resumen de actividad de tu empresa" :
    "Aquí tienes un resumen de tu actividad";

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground">{titulo}</h1>
      <p className="text-sm text-muted-foreground mt-0.5 mb-6">{subtitulo}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const content = (
            <>
              <div className="text-xs text-muted-foreground font-display mb-1.5">{s.label}</div>
              <div className={`font-display text-3xl font-semibold ${s.accent ? "text-primary" : "text-foreground"}`}>
                {s.value}
              </div>
            </>
          );
          const base = "bg-card border border-border rounded-xl p-5 shadow-card transition-all";
          return s.to ? (
            <Link key={s.label} to={s.to} className={`${base} block hover:border-primary hover:shadow-md hover:-translate-y-0.5`}>
              {content}
            </Link>
          ) : (
            <div key={s.label} className={base}>{content}</div>
          );
        })}
      </div>

      <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Las secciones específicas de tu rol están disponibles en el menú lateral. Las funcionalidades completas se irán habilitando en las siguientes fases.
        </p>
      </div>
    </div>
  );
}
