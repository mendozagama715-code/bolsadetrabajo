// Edge function: crea un usuario administrador.
// Dos modos:
//  1) Solicitante autenticado con rol admin/super_admin -> puede crear admin o super_admin.
//  2) Autoregistro público con `access_code` válido (ADMIN_ACCESS_CODE) -> crea rol 'admin'.
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
  rol?: "admin" | "super_admin";
  area?: string;
  access_code?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const ADMIN_ACCESS_CODE = Deno.env.get("ADMIN_ACCESS_CODE") ?? "";

    const body = (await req.json()) as Body;
    const nombre = (body.nombre ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const confirm = body.password_confirmation ?? "";
    const area = (body.area ?? "").trim();
    const access_code = (body.access_code ?? "").trim();

    if (!nombre || nombre.length < 2) return json({ error: "Nombre inválido" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Correo inválido" }, 400);
    if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    if (password !== confirm) return json({ error: "Las contraseñas no coinciden" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let rol: "admin" | "super_admin" = body.rol === "super_admin" ? "super_admin" : "admin";
    let mode: "self" | "managed" = "self";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ") && access_code === "") {
      // Modo gestionado: requiere ser admin/super_admin
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) return json({ error: "No autenticado" }, 401);
      const callerId = userData.user.id;

      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);
      const roleSet = new Set((roles ?? []).map((r) => r.role));
      const isSuper = roleSet.has("super_admin");
      const isAdmin = roleSet.has("admin");
      if (!isSuper && !isAdmin) return json({ error: "No tienes permisos" }, 403);
      if (rol === "super_admin" && !isSuper) {
        return json({ error: "Solo un super administrador puede crear otro super administrador" }, 403);
      }
      mode = "managed";
    } else {
      // Modo autoregistro: validar código de acceso institucional
      if (!ADMIN_ACCESS_CODE) {
        return json({ error: "El registro de administradores no está habilitado" }, 503);
      }
      if (!access_code || access_code !== ADMIN_ACCESS_CODE) {
        return json({ error: "Código de acceso institucional inválido" }, 403);
      }
      if (!area || area.length < 2) {
        return json({ error: "El área / departamento es obligatorio" }, 400);
      }
      rol = "admin"; // autoregistro nunca crea super_admin
    }

    // Crear usuario en Auth (auto-confirmado)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, area },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "No se pudo crear el usuario" }, 400);

    const newId = created.user.id;

    // Garantizar profile con area
    await admin
      .from("profiles")
      .upsert({ user_id: newId, nombre, area: area || null }, { onConflict: "user_id" });

    // Asignar rol
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: newId, role: rol });
    if (roleErr) {
      await admin.auth.admin.deleteUser(newId);
      return json({ error: roleErr.message }, 500);
    }

    return json({ id: newId, email, rol, mode }, 201);
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
