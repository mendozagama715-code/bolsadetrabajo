import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";

export function PublicNav() {
  const links = [
    { to: "/", label: "Inicio" },
    { to: "/auth", label: "Iniciar sesión" },
  ];
  return (
    <header className="h-[52px] bg-vino-dark px-6 md:px-8 flex items-center gap-4 shrink-0">
      <Link to="/"><Logo /></Link>
      <nav className="ml-auto flex gap-6">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `font-display text-xs text-crema hover:text-white transition ${isActive ? "text-white" : ""}`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="h-8 bg-vino-dark flex items-center justify-center shrink-0">
      <span className="text-[10px] text-crema/75">
        © 2025 Universidad Interserrana del Estado de Puebla Chilchotla — Todos los derechos reservados
      </span>
    </footer>
  );
}
