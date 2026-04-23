import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth, AppRole } from "@/lib/auth-context";
import {
  LayoutDashboard, Briefcase, FileText, User, LogOut,
  PlusSquare, Users, Calendar, BarChart3, Building2, ShieldCheck,
} from "lucide-react";
import { Footer } from "./PublicNav";

interface NavItem { to: string; label: string; icon: ReactNode; }

const NAV: Record<AppRole, { section: string; items: NavItem[] }[]> = {
  egresado: [
    { section: "Egresado", items: [
      { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { to: "/app/vacantes", label: "Ver vacantes", icon: <Briefcase size={16} /> },
      { to: "/app/postulaciones", label: "Mis postulaciones", icon: <FileText size={16} /> },
    ]},
    { section: "Cuenta", items: [
      { to: "/app/perfil", label: "Mi perfil", icon: <User size={16} /> },
    ]},
  ],
  empresa: [
    { section: "Empresa", items: [
      { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { to: "/app/mis-vacantes", label: "Mis vacantes", icon: <Briefcase size={16} /> },
      { to: "/app/publicar", label: "Publicar vacante", icon: <PlusSquare size={16} /> },
      { to: "/app/postulantes", label: "Postulantes", icon: <Users size={16} /> },
      { to: "/app/calendario", label: "Seguimiento", icon: <Calendar size={16} /> },
    ]},
    { section: "Cuenta", items: [
      { to: "/app/perfil", label: "Perfil empresa", icon: <Building2 size={16} /> },
    ]},
  ],
  admin: [
    { section: "Administración", items: [
      { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { to: "/app/admin/empresas", label: "Validar empresas", icon: <ShieldCheck size={16} /> },
      { to: "/app/admin/usuarios", label: "Gestión usuarios", icon: <Users size={16} /> },
      { to: "/app/admin/vacantes", label: "Gestión vacantes", icon: <Briefcase size={16} /> },
      { to: "/app/admin/reportes", label: "Reportes", icon: <BarChart3 size={16} /> },
    ]},
    { section: "Cuenta", items: [
      { to: "/app/perfil", label: "Mi perfil", icon: <User size={16} /> },
    ]},
  ],
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const sections = role ? NAV[role] : [];
  const initials = (profile?.nombre || user?.email || "U")
    .split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Topbar */}
      <header className="h-[52px] bg-vino-dark px-6 flex items-center gap-4 shrink-0">
        <Logo />
        <div className="ml-auto flex items-center gap-3">
          {role === "admin" && (
            <span className="font-display text-[9px] bg-crema text-vino-dark px-2 py-0.5 rounded-full font-bold">ADMIN</span>
          )}
          <div className="w-8 h-8 rounded-full bg-crema text-vino-dark flex items-center justify-center font-display text-[11px] font-semibold">
            {initials}
          </div>
          <span className="hidden md:block font-display text-xs text-crema">{profile?.nombre ?? user?.email}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-card border-r border-border flex flex-col py-3 shrink-0 overflow-y-auto">
          {sections.map((s) => (
            <div key={s.section}>
              <div className="font-display text-[10px] font-semibold text-muted-foreground tracking-wider uppercase px-4 mt-3 mb-1.5">{s.section}</div>
              {s.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === "/app"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 cursor-pointer border-l-[3px] transition ${
                      isActive
                        ? "border-primary bg-secondary text-primary [&_svg]:text-primary"
                        : "border-transparent hover:bg-secondary/60 text-muted-foreground [&_svg]:text-muted-foreground"
                    }`
                  }
                >
                  {it.icon}
                  <span className="font-display text-xs font-medium">{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <div className="mt-auto border-t border-border pt-2">
            <button
              onClick={async () => { await signOut(); navigate("/auth"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-secondary/60 hover:text-primary transition"
            >
              <LogOut size={16} />
              <span className="font-display text-xs font-medium">Cerrar sesión</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
