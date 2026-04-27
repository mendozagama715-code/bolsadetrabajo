-- Renombrar valor del enum 'entrevista' a 'proceso' en estado_postulacion
ALTER TYPE public.estado_postulacion RENAME VALUE 'entrevista' TO 'proceso';