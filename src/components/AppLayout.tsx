import { ReactNode, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth, AppRole } from "@/lib/auth-context";
import {
  LayoutDashboard, Briefcase, FileText, User, LogOut,
  PlusSquare, Users, Calendar, BarChart3, Building2, ShieldCheck, UserPlus,
  Menu, X,
} from "lucide-react";
import { Footer } from "./PublicNav";
import { NotificationsBell } from "./NotificationsBell";

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
      { to: "/app/admin/crear-admin", label: "Crear administrador", icon: <UserPlus size={16} /> },
    ]},
    { section: "Cuenta", items: [
      { to: "/app/perfil", label: "Mi perfil", icon: <User size={16} /> },
    ]},
  ],
  super_admin: [
    { section: "Super administración", items: [
      { to: "/app", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
      { to: "/app/admin/empresas", label: "Validar empresas", icon: <ShieldCheck size={16} /> },
      { to: "/app/admin/usuarios", label: "Gestión usuarios", icon: <Users size={16} /> },
      { to: "/app/admin/vacantes", label: "Gestión vacantes", icon: <Briefcase size={16} /> },
      { to: "/app/admin/reportes", label: "Reportes", icon: <BarChart3 size={16} /> },
      { to: "/app/admin/crear-admin", label: "Crear administrador", icon: <UserPlus size={16} /> },
    ]},
    { section: "Cuenta", items: [
      { to: "/app/perfil", label: "Mi perfil", icon: <User size={16} /> },
    ]},
  ],
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sections = role ? NAV[role] : [];
  const initials = (profile?.nombre || user?.email || "U")
    .split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  // Cerrar drawer al cambiar de ruta
  const closeMobile = () => setMobileOpen(false);

  const SidebarContent = (
    <>
      {sections.map((s) => (
        <div key={s.section}>
          <div className="font-display text-[10px] font-semibold text-muted-foreground tracking-wider uppercase px-4 mt-3 mb-1.5">{s.section}</div>
          {s.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/app"}
              onClick={closeMobile}
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
          onClick={async () => { closeMobile(); await signOut(); navigate("/auth"); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-secondary/60 hover:text-primary transition"
        >
          <LogOut size={16} />
          <span className="font-display text-xs font-medium">Cerrar sesión</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Topbar */}
      <header className="h-[52px] bg-vino-dark px-3 sm:px-6 flex items-center gap-2 sm:gap-4 shrink-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden w-9 h-9 -ml-1 rounded-lg text-crema hover:bg-white/10 flex items-center justify-center"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <NotificationsBell />
          {(role === "admin" || role === "super_admin") && (
            <span className="font-display text-[9px] bg-crema text-vino-dark px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
              {role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}
            </span>
          )}
          <div className="w-8 h-8 rounded-full bg-crema text-vino-dark flex items-center justify-center font-display text-[11px] font-semibold shrink-0">
            {initials}
          </div>
          <span className="hidden lg:block font-display text-xs text-crema truncate max-w-[160px]">{profile?.nombre ?? user?.email}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex w-56 bg-card border-r border-border flex-col py-3 shrink-0 overflow-y-auto">
          {SidebarContent}
        </aside>

        {/* Sidebar — drawer móvil */}
        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={closeMobile}
              aria-hidden="true"
            />
            <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col py-3 z-50 overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-border">
                <span className="font-display text-sm font-semibold text-foreground">Menú</span>
                <button
                  onClick={closeMobile}
                  className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-secondary flex items-center justify-center"
                  aria-label="Cerrar menú"
                >
                  <X size={18} />
                </button>
              </div>
              {SidebarContent}
            </aside>
          </>
        )}

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 min-w-0">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
