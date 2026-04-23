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
import Placeholder from "./pages/app/Placeholder.tsx";

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
            <Route path="/app/vacantes" element={<Wrapped><RequireRole roles={["egresado"]}><Placeholder title="Vacantes disponibles" subtitle="Encuentra oportunidades laborales en la región" /></RequireRole></Wrapped>} />
            <Route path="/app/postulaciones" element={<Wrapped><RequireRole roles={["egresado"]}><Placeholder title="Mis postulaciones" subtitle="Sigue el estado de tus postulaciones" /></RequireRole></Wrapped>} />

            {/* Empresa */}
            <Route path="/app/mis-vacantes" element={<Wrapped><RequireRole roles={["empresa"]}><Placeholder title="Mis vacantes" subtitle="Gestiona las vacantes publicadas" /></RequireRole></Wrapped>} />
            <Route path="/app/publicar" element={<Wrapped><RequireRole roles={["empresa"]}><Placeholder title="Publicar nueva vacante" /></RequireRole></Wrapped>} />
            <Route path="/app/postulantes" element={<Wrapped><RequireRole roles={["empresa"]}><Placeholder title="Postulantes" /></RequireRole></Wrapped>} />
            <Route path="/app/calendario" element={<Wrapped><RequireRole roles={["empresa"]}><Placeholder title="Calendario de seguimiento" /></RequireRole></Wrapped>} />

            {/* Admin */}
            <Route path="/app/admin/empresas" element={<Wrapped><RequireRole roles={["admin"]}><Placeholder title="Validación de empresas" /></RequireRole></Wrapped>} />
            <Route path="/app/admin/usuarios" element={<Wrapped><RequireRole roles={["admin"]}><Placeholder title="Gestión de usuarios" /></RequireRole></Wrapped>} />
            <Route path="/app/admin/vacantes" element={<Wrapped><RequireRole roles={["admin"]}><Placeholder title="Gestión de vacantes" /></RequireRole></Wrapped>} />
            <Route path="/app/admin/reportes" element={<Wrapped><RequireRole roles={["admin"]}><Placeholder title="Reportes y estadísticas" /></RequireRole></Wrapped>} />

            <Route path="/app/perfil" element={<Wrapped><Placeholder title="Mi perfil" subtitle="Edita tu información personal" /></Wrapped>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
