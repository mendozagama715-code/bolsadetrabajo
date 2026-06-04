// Algoritmo de emparejamiento inteligente: filtrado basado en contenido
// con similitud de cosenos sobre vectores TF (término-frecuencia).
// Compara el perfil del egresado (habilidades, experiencia, carrera) con
// los requisitos de cada vacante para producir un puntaje 0-100.

const STOPWORDS = new Set([
  "a","ante","bajo","con","contra","de","del","desde","durante","en","entre","hacia","hasta",
  "mediante","para","por","según","sin","sobre","tras","y","e","o","u","ni","que","si","no",
  "el","la","los","las","un","una","unos","unas","lo","al","es","ser","son","fue","como","más",
  "menos","muy","mi","tu","su","sus","mis","tus","yo","tú","él","ella","nos","les","se","te",
  "me","este","esta","estos","estas","ese","esa","esos","esas","aquel","aquella","cual","cuales",
  "donde","cuando","quien","quienes","porque","pues","ya","aun","aunque","etc","años","año",
]);

function normalize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes
    .replace(/[^a-z0-9ñ\s+#.-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  if (!a.size || !b.size) return 0;
  let dot = 0;
  for (const [k, v] of a) {
    const bv = b.get(k);
    if (bv) dot += v * bv;
  }
  let na = 0, nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export interface EgresadoPerfil {
  habilidades?: string[] | null;
  experiencia?: string | null;
  carrera?: string | null;
  ubicacion?: string | null;
}

export interface VacanteMatch {
  puesto: string;
  descripcion: string;
  requisitos?: string | null;
  area?: string | null;
  carrera_solicitada?: string | null;
  ubicacion?: string | null;
}

/**
 * Calcula el puntaje de coincidencia entre un egresado y una vacante.
 * - Similitud de cosenos sobre texto completo (TF) — 70%
 * - Coincidencia directa de habilidades vs requisitos — 25%
 * - Bonus por carrera/ubicación — 5%
 * Devuelve un entero 0-100.
 */
export function matchScore(eg: EgresadoPerfil, vac: VacanteMatch): number {
  const habs = (eg.habilidades ?? []).join(" ");
  const egText = `${habs} ${habs} ${eg.experiencia ?? ""} ${eg.carrera ?? ""}`;
  const vacText = `${vac.puesto} ${vac.puesto} ${vac.descripcion} ${vac.requisitos ?? ""} ${vac.area ?? ""} ${vac.carrera_solicitada ?? ""}`;

  const egTokens = normalize(egText);
  const vacTokens = normalize(vacText);
  const cos = cosine(termFreq(egTokens), termFreq(vacTokens));

  // Coincidencia directa de habilidades
  const habSet = new Set((eg.habilidades ?? []).flatMap((h) => normalize(h)));
  const vacSet = new Set(vacTokens);
  let hits = 0;
  habSet.forEach((h) => { if (vacSet.has(h)) hits++; });
  const habRatio = habSet.size ? hits / habSet.size : 0;

  // Bonus
  let bonus = 0;
  if (eg.carrera && vac.carrera_solicitada) {
    const c1 = new Set(normalize(eg.carrera));
    const c2 = new Set(normalize(vac.carrera_solicitada));
    let common = 0;
    c1.forEach((t) => { if (c2.has(t)) common++; });
    if (common >= 2) bonus += 0.6;
  }
  if (eg.ubicacion && vac.ubicacion &&
      normalize(eg.ubicacion).some((t) => normalize(vac.ubicacion!).includes(t))) {
    bonus += 0.4;
  }

  const score = cos * 0.7 + habRatio * 0.25 + (bonus / 1) * 0.05;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

export function matchLabel(score: number): { text: string; tone: "high" | "mid" | "low" } {
  if (score >= 70) return { text: "Excelente match", tone: "high" };
  if (score >= 40) return { text: "Buen match", tone: "mid" };
  return { text: "Match bajo", tone: "low" };
}
