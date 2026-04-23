import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/lib/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!role || !roles.includes(role)) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
