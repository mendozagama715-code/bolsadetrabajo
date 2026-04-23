import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAuth, RequireRole } from "@/components/RouteGuards";
import { AppLayout } from "@/components/AppLayout";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Recuperar from "./pages/Recuperar.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Dashboard from "./pages/app/Dashboard.tsx";
import PerfilRouter from "./pages/app/PerfilRouter.tsx";

import Vacantes from "./pages/app/egresado/Vacantes.tsx";
import Postulaciones from "./pages/app/egresado/Postulaciones.tsx";

import MisVacantes from "./pages/app/empresa/MisVacantes.tsx";
import PublicarVacante from "./pages/app/empresa/PublicarVacante.tsx";
import Postulantes from "./pages/app/empresa/Postulantes.tsx";
import Calendario from "./pages/app/empresa/Calendario.tsx";

import ValidacionEmpresas from "./pages/app/admin/ValidacionEmpresas.tsx";
import GestionUsuarios from "./pages/app/admin/GestionUsuarios.tsx";
import GestionVacantes from "./pages/app/admin/GestionVacantes.tsx";
import Reportes from "./pages/app/admin/Reportes.tsx";

const queryClient = new QueryClient();

const Wrapped = ({ children }: { children: React.ReactNode }) => (
  <RequireAuth><AppLayout>{children}</AppLayout></RequireAuth>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/recuperar" element={<Recuperar />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/app" element={<Wrapped><Dashboard /></Wrapped>} />

            {/* Egresado */}
            <Route path="/app/vacantes" element={<Wrapped><RequireRole roles={["egresado"]}><Vacantes /></RequireRole></Wrapped>} />
            <Route path="/app/postulaciones" element={<Wrapped><RequireRole roles={["egresado"]}><Postulaciones /></RequireRole></Wrapped>} />

            {/* Empresa */}
            <Route path="/app/mis-vacantes" element={<Wrapped><RequireRole roles={["empresa"]}><MisVacantes /></RequireRole></Wrapped>} />
            <Route path="/app/publicar" element={<Wrapped><RequireRole roles={["empresa"]}><PublicarVacante /></RequireRole></Wrapped>} />
            <Route path="/app/postulantes" element={<Wrapped><RequireRole roles={["empresa"]}><Postulantes /></RequireRole></Wrapped>} />
            <Route path="/app/calendario" element={<Wrapped><RequireRole roles={["empresa"]}><Calendario /></RequireRole></Wrapped>} />

            {/* Admin */}
            <Route path="/app/admin/empresas" element={<Wrapped><RequireRole roles={["admin"]}><ValidacionEmpresas /></RequireRole></Wrapped>} />
            <Route path="/app/admin/usuarios" element={<Wrapped><RequireRole roles={["admin"]}><GestionUsuarios /></RequireRole></Wrapped>} />
            <Route path="/app/admin/vacantes" element={<Wrapped><RequireRole roles={["admin"]}><GestionVacantes /></RequireRole></Wrapped>} />
            <Route path="/app/admin/reportes" element={<Wrapped><RequireRole roles={["admin"]}><Reportes /></RequireRole></Wrapped>} />

            <Route path="/app/perfil" element={<Wrapped><PerfilRouter /></Wrapped>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
