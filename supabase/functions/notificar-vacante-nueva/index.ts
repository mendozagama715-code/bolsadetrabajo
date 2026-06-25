// Edge function: dispara correos a egresados con match >= 65% cuando se publica una vacante.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const MATCH_THRESHOLD = 65
const APP_URL = 'https://bolsadetrabajo.lovable.app'

const STOPWORDS = new Set([
  'a','ante','bajo','con','contra','de','del','desde','durante','en','entre','hacia','hasta',
  'mediante','para','por','segun','sin','sobre','tras','y','e','o','u','ni','que','si','no',
  'el','la','los','las','un','una','unos','unas','lo','al','es','ser','son','fue','como','mas',
  'menos','muy','mi','tu','su','sus','mis','tus','yo','tu','el','ella','nos','les','se','te',
  'me','este','esta','estos','estas','ese','esa','esos','esas','aquel','aquella','cual','cuales',
  'donde','cuando','quien','quienes','porque','pues','ya','aun','aunque','etc','anos','ano',
])

function normalize(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s+#.-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}
function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}
function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (!a.size || !b.size) return 0
  let dot = 0
  for (const [k, v] of a) { const bv = b.get(k); if (bv) dot += v * bv }
  let na = 0, nb = 0
  for (const v of a.values()) na += v * v
  for (const v of b.values()) nb += v * v
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}
function matchScore(eg: any, vac: any): number {
  const habs = (eg.habilidades ?? []).join(' ')
  const egText = `${habs} ${habs} ${eg.experiencia ?? ''} ${eg.carrera ?? ''}`
  const vacText = `${vac.puesto} ${vac.puesto} ${vac.descripcion} ${vac.requisitos ?? ''} ${vac.area ?? ''} ${vac.carrera_solicitada ?? ''}`
  const cos = cosine(termFreq(normalize(egText)), termFreq(normalize(vacText)))
  const habSet = new Set((eg.habilidades ?? []).flatMap((h: string) => normalize(h)))
  const vacSet = new Set(normalize(vacText))
  let hits = 0
  habSet.forEach((h) => { if (vacSet.has(h as string)) hits++ })
  const habRatio = habSet.size ? hits / habSet.size : 0
  let bonus = 0
  if (eg.carrera && vac.carrera_solicitada) {
    const c1 = new Set(normalize(eg.carrera))
    const c2 = new Set(normalize(vac.carrera_solicitada))
    let common = 0
    c1.forEach((t) => { if (c2.has(t as string)) common++ })
    if (common >= 2) bonus += 0.6
  }
  if (eg.ubicacion && vac.ubicacion &&
      normalize(eg.ubicacion).some((t) => normalize(vac.ubicacion).includes(t))) {
    bonus += 0.4
  }
  return Math.max(0, Math.min(100, Math.round((cos * 0.7 + habRatio * 0.25 + bonus * 0.05) * 100)))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { vacante_id } = await req.json()
    if (!vacante_id) {
      return new Response(JSON.stringify({ error: 'vacante_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: vacante, error: vErr } = await supabase
      .from('vacantes')
      .select('id, puesto, descripcion, requisitos, area, carrera_solicitada, ubicacion, tipo_contrato, empresa_id, empresas(nombre_empresa)')
      .eq('id', vacante_id)
      .maybeSingle()
    if (vErr || !vacante) {
      return new Response(JSON.stringify({ error: 'Vacante no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Egresados que optaron por recibir notificaciones (email o push)
    const { data: egresados, error: eErr } = await supabase
      .from('egresados')
      .select('id, user_id, nombre, email, habilidades, experiencia, carrera, ubicacion, notif_email_vacantes, notif_push_vacantes')
      .or('notif_email_vacantes.eq.true,notif_push_vacantes.eq.true')
    if (eErr) throw eErr

    const empresaNombre = (vacante as any).empresas?.nombre_empresa ?? 'Empresa'
    const vacanteUrl = `${APP_URL}/app/vacantes?v=${vacante.id}`
    let enviados = 0
    const pushUserIds: string[] = []

    for (const eg of egresados ?? []) {
      const score = matchScore(eg, vacante)
      if (score < MATCH_THRESHOLD) continue

      if ((eg as any).notif_email_vacantes && eg.email) {
        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'vacante-compatible',
            recipientEmail: eg.email,
            idempotencyKey: `vacante-${vacante.id}-eg-${eg.id}`,
            templateData: {
              nombre: eg.nombre ?? 'Egresado',
              puesto: vacante.puesto,
              empresa: empresaNombre,
              ubicacion: vacante.ubicacion,
              tipo_contrato: vacante.tipo_contrato,
              score,
              vacante_url: vacanteUrl,
            },
          },
        })
        if (!sendErr) enviados++
        else console.error('send err', eg.email, sendErr)
      }

      if ((eg as any).notif_push_vacantes && eg.user_id) {
        pushUserIds.push(eg.user_id)
      }
    }

    let pushSent = 0
    if (pushUserIds.length) {
      const { data: pushRes, error: pushErr } = await supabase.functions.invoke('enviar-push', {
        body: {
          user_ids: pushUserIds,
          title: `Nueva vacante compatible: ${vacante.puesto}`,
          body: `${empresaNombre} • ${vacante.ubicacion ?? ''}`.trim(),
          url: `/app/vacantes?v=${vacante.id}`,
          tag: `vacante-${vacante.id}`,
        },
      })
      if (pushErr) console.error('push invoke err', pushErr)
      else pushSent = (pushRes as any)?.sent ?? 0
    }

    return new Response(JSON.stringify({ ok: true, enviados, push_enviados: pushSent, total: egresados?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
