// Envía Web Push (VAPID) a uno o varios usuarios.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@bolsadetrabajo.lovable.app",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_ids, title, body, url, tag } = await req.json();
    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title) {
      return new Response(JSON.stringify({ error: "user_ids[] y title son requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tokens, error } = await supabase
      .from("push_tokens")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", user_ids);
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/", tag });
    let sent = 0, removed = 0;
    const stale: string[] = [];

    await Promise.all((tokens ?? []).map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) stale.push(t.id);
        else console.error("push err", t.endpoint, code, e?.body);
      }
    }));

    if (stale.length) {
      await supabase.from("push_tokens").delete().in("id", stale);
      removed = stale.length;
    }

    return new Response(JSON.stringify({ ok: true, sent, removed, total: tokens?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
