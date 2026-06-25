## Plan de implementación — Bolsa de Trabajo v2

Voy a entregar las 4 mejoras en este orden (cada fase es funcional por sí sola, no rompe lo anterior).

---

### FASE 1 — Responsividad móvil completa

**Archivos a tocar:**
- `src/components/AppLayout.tsx` → sidebar fija pasa a **drawer** con botón hamburguesa en `<md`.
- `src/pages/app/egresado/Vacantes.tsx` → grid de 2 columnas pasa a 1 en móvil; modal de matcher full-screen en móvil.
- `src/pages/app/egresado/Perfil.tsx`, `Postulaciones.tsx` → inputs full-width, padding ajustado.
- `src/pages/app/empresa/MisVacantes.tsx`, `PublicarVacante.tsx`, `Postulantes.tsx` → tablas → tarjetas en móvil.
- `src/pages/Index.tsx`, `Auth.tsx` → hero y formulario centrados en móvil.

**Técnica:** breakpoints Tailwind (`sm:`, `md:`, `lg:`), `flex-col md:flex-row`, `hidden md:block`, drawer con `<Sheet>` de shadcn.

---

### FASE 2 — Pulir CRUDs

**Empresa (`MisVacantes.tsx`):**
- Agregar botones **Editar** (modal con form precargado) y **Eliminar** (con confirmación).
- Toggle "Activa / Pausada / Cerrada" actualizando `vacantes.estado`.

**Egresado (`Perfil.tsx`):**
- Validación extra de CV: solo `application/pdf`, máx 5MB (ya existe), nombre sanitizado.
- Mostrar fecha de última actualización del CV.

**Sin cambios de schema** — solo UI sobre tablas existentes.

---

### FASE 3 — Alertas por correo (match ≥65%)

**Backend:**
1. Edge Function `notificar-vacante-nueva`:
   - Recibe `vacante_id`.
   - Carga la vacante + todos los egresados activos con perfil completo.
   - Reutiliza el algoritmo de `src/lib/matching.ts` (lo movemos a `supabase/functions/_shared/matching.ts` para compartirlo).
   - Para cada egresado con score ≥ 65%, inserta en `notificaciones` Y llama a `send-transactional-email`.

2. **Email infra** (Lovable Emails):
   - `email_domain--check_email_domain_status` → si no hay dominio, abrir diálogo de configuración.
   - `setup_email_infra` + `scaffold_transactional_email`.
   - Template `vacante-compatible.tsx` con: nombre del puesto, empresa, % de match, botón "Ver vacante".

3. **Trigger:** en `PublicarVacante.tsx`, después del `insert`, invocar la Edge Function (fire-and-forget).

4. **Preferencias del usuario:** agregar columna `egresados.notif_email_vacantes BOOLEAN DEFAULT true` + toggle en Perfil para opt-out.

---

### FASE 4 — PWA + Web Push (Firebase Cloud Messaging)

**4.1 PWA básica (instalable):**
- `public/manifest.webmanifest` con name, icons, theme color institucional.
- Íconos 192/512 generados.
- Tags en `index.html`: `<link rel="manifest">`, `<meta name="theme-color">`, `apple-touch-icon`.

**4.2 Firebase Cloud Messaging:**
- Usuario crea proyecto Firebase y comparte: `apiKey`, `projectId`, `messagingSenderId`, `appId`, `vapidKey` (públicos, van en `.env`), y `serviceAccountJson` (secreto vía `add_secret`).
- `public/firebase-messaging-sw.js` → service worker SOLO para FCM (no afecta caching/offline).
- `src/lib/push.ts` → pide permiso, obtiene token FCM, lo guarda en tabla nueva `push_tokens`.
- Componente "Activar notificaciones" en Perfil del egresado.

**4.3 Schema nuevo:**
```sql
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  device text,
  created_at timestamptz DEFAULT now()
);
-- GRANTs + RLS (user_id = auth.uid())
```

**4.4 Edge Function `enviar-push`:**
- Usa Firebase Admin SDK (service account) para mandar push HTTP v1.
- La función `notificar-vacante-nueva` ya creada en Fase 3 también dispara push al mismo tiempo que el correo.

---

### Detalles técnicos resumen

| Cambio | Tipo |
|---|---|
| `supabase/functions/_shared/matching.ts` | nuevo (mover lógica) |
| `supabase/functions/notificar-vacante-nueva/index.ts` | nuevo |
| `supabase/functions/enviar-push/index.ts` | nuevo |
| `supabase/functions/_shared/transactional-email-templates/vacante-compatible.tsx` | nuevo |
| Tabla `push_tokens` + columna `egresados.notif_email_vacantes` | migración |
| `public/manifest.webmanifest`, `firebase-messaging-sw.js`, íconos | nuevo |
| `src/lib/push.ts` | nuevo |
| `src/components/AppLayout.tsx` + todas las páginas | edit (responsive) |
| `src/pages/app/empresa/MisVacantes.tsx` | edit (CRUD) |

---

### Lo que necesito de ti para Fase 3 y 4
- **Fase 3:** un dominio (o subdominio tipo `notify.tudominio.com`) para configurar Lovable Emails. Si aún no lo tienes, te abro el diálogo y seguimos cuando lo tengas.
- **Fase 4:** crear proyecto en Firebase Console → habilitar Cloud Messaging → te pediré las credenciales cuando lleguemos a esa fase.

¿Apruebas el plan y arranco con Fase 1?