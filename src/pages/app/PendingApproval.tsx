import { useAuth } from "@/lib/auth-context";
import { Clock, XCircle } from "lucide-react";

export function PendingApproval() {
  const { status, role, profile } = useAuth();
  const rejected = status?.estado === "rechazado";

  return (
    <div className="max-w-xl mx-auto mt-10 bg-card border border-border rounded-xl p-8 text-center shadow-card animate-fade-in">
      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
        rejected ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning-foreground"
      }`}>
        {rejected ? <XCircle size={32} /> : <Clock size={32} />}
      </div>
      <h2 className="font-display text-xl font-bold mb-2">
        {rejected ? "Cuenta rechazada" : "Cuenta pendiente de validación"}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Hola <span className="text-foreground font-medium">{profile?.nombre}</span>.{" "}
        {rejected ? (
          <>Tu registro como {role} fue rechazado por el administrador.</>
        ) : (
          <>Tu registro como {role} está siendo revisado por el administrador. Recibirás acceso completo una vez aprobada.</>
        )}
      </p>
      {rejected && status?.motivo_rechazo && (
        <div className="mt-4 text-left bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
          <div className="font-display font-medium text-destructive mb-1">Motivo:</div>
          <div className="text-foreground/80">{status.motivo_rechazo}</div>
        </div>
      )}
    </div>
  );
}
