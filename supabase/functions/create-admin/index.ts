// Edge function: crea un usuario administrador.
// Solo accesible por usuarios autenticados con rol 'admin' o 'super_admin'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  nombre: string;
  email: string;
  password: string;
  password_confirmation: string;
  rol: "admin" | "super_admin";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "No autenticado" }, 401);
    }

    // Cliente con el JWT del solicitante para identificarlo
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "No autenticado" }, 401);
    const callerId = userData.user.id;

    // Cliente admin con service role para operaciones privilegiadas
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verificar rol del solicitante
    const { data: roles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (rolesErr) return json({ error: rolesErr.message }, 500);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const isSuper = roleSet.has("super_admin");
    const isAdmin = roleSet.has("admin");
    if (!isSuper && !isAdmin) return json({ error: "No tienes permisos" }, 403);

    const body = (await req.json()) as Body;
    const nombre = (body.nombre ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const confirm = body.password_confirmation ?? "";
    const rol = body.rol ?? "admin";

    if (!nombre || nombre.length < 2) return json({ error: "Nombre inválido" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Correo inválido" }, 400);
    if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    if (password !== confirm) return json({ error: "Las contraseñas no coinciden" }, 400);
    if (!["admin", "super_admin"].includes(rol)) return json({ error: "Rol inválido" }, 400);
    if (rol === "super_admin" && !isSuper) {
      return json({ error: "Solo un super administrador puede crear otro super administrador" }, 403);
    }

    // Crear usuario en Auth (auto-confirmado para admins)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "No se pudo crear el usuario" }, 400);

    const newId = created.user.id;

    // Garantizar profile (trigger handle_new_user lo crea, pero por si acaso)
    await admin.from("profiles").upsert({ user_id: newId, nombre }, { onConflict: "user_id" });

    // Asignar rol (bypass de RLS gracias al service role; el trigger super_admin solo aplica vía RLS)
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: newId, role: rol });
    if (roleErr) {
      // rollback del usuario auth si falla el rol
      await admin.auth.admin.deleteUser(newId);
      return json({ error: roleErr.message }, 500);
    }

    return json({ id: newId, email, rol }, 201);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
