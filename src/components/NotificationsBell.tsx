import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Notif {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: "info" | "exito" | "advertencia" | "error";
  enlace: string | null;
  leida: boolean;
  created_at: string;
}

const tipoColor: Record<Notif["tipo"], string> = {
  info: "bg-primary",
  exito: "bg-success",
  advertencia: "bg-warning",
  error: "bg-destructive",
};

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notif[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const noLeidas = items.filter((n) => !n.leida).length;

  const marcarLeida = async (id: string) => {
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  };
  const marcarTodas = async () => {
    if (!user) return;
    await supabase.from("notificaciones").update({ leida: true }).eq("user_id", user.id).eq("leida", false);
  };
  const handleClick = async (n: Notif) => {
    if (!n.leida) await marcarLeida(n.id);
    if (n.enlace) navigate(n.enlace);
    setOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-full bg-crema/10 hover:bg-crema/20 text-crema flex items-center justify-center transition"
        aria-label="Notificaciones"
      >
        <Bell size={16} />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-md z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">Notificaciones</h3>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="text-[10px] font-display text-primary hover:underline flex items-center gap-1">
                <Check size={12} /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Sin notificaciones</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/50 transition flex gap-3 ${!n.leida ? "bg-secondary/30" : ""}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${tipoColor[n.tipo]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xs font-semibold text-foreground">{n.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensaje}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
