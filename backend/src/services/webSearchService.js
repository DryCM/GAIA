/* ================================================================
   GaIA Web Search Service / Servicio de Búsqueda Web
   ES: Proporciona búsqueda en internet para enriquecer las
       respuestas de la IA con información actual.
       Proveedores soportados (en orden de prioridad):
         1. Brave Search API (BRAVE_SEARCH_KEY en .env) – 2 000 gratis/mes
         2. SerpAPI (SERPAPI_KEY en .env) – 100 gratis/mes
         3. DuckDuckGo Instant Answer (sin clave, siempre disponible)
   EN: Provides internet search to enrich AI responses with
       current information.
       Supported providers (priority order):
         1. Brave Search API (BRAVE_SEARCH_KEY in .env) – 2,000 free/month
         2. SerpAPI (SERPAPI_KEY in .env) – 100 free/month
         3. DuckDuckGo Instant Answer (no key, always available)
   ================================================================ */

const BRAVE_KEY   = (process.env.BRAVE_SEARCH_KEY  || "").trim();
const SERPAPI_KEY = (process.env.SERPAPI_KEY        || "").trim();

// ES: Palabras clave que activan la búsqueda automática en el chat.
//     Si el mensaje del usuario contiene alguna de ellas, se lanza
//     una búsqueda web antes de construir la respuesta de la IA.
// EN: Keywords that trigger automatic search in chat.
//     If the user's message contains any of them, a web search is
//     launched before the AI builds its response.
const SEARCH_TRIGGER_PATTERNS = [
  /\bbusca\b/i,
  /\bencuentra\b/i,
  /\bnoticias\b/i,
  /\bactualmente\b/i,
  /\bhoy en d[ií]a\b/i,
  /\ben este momento\b/i,
  /\bqu[eé] hay de nuevo\b/i,
  /\b[uú]ltimo[s]?\b/i,
  /\breciente[s]?\b/i,
  /\b¿?cu[aá]ndo (fue|es|ser[aá])\b/i,
  /\b¿?d[oó]nde (est[aá]|queda|se encuentra)\b/i,
  /\bcuánto cuesta\b/i,
  /\bprecio de\b/i,
  /\binfo[rs]?m[ae]\b/i,
  /\binvestiga\b/i,
  /^(qué es|c[oó]mo se hace|por qué|qu[eé] significa)/i,
];

// ES: Longitud máxima del fragmento de resultado que se inyecta en el prompt
// EN: Max length of the result snippet injected into the prompt
const MAX_SNIPPET_CHARS = 600;

// ── Detección de intención de búsqueda ───────────────────────────────────
// ES: Devuelve true si el mensaje del usuario parece requerir búsqueda web.
// EN: Returns true if the user message seems to require a web search.
function needsWebSearch(text) {
  return SEARCH_TRIGGER_PATTERNS.some((pattern) => pattern.test(text));
}

// ── Brave Search API ─────────────────────────────────────────────────────
async function searchWithBrave(query) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("search_lang", "es");
  url.searchParams.set("ui_lang", "es-ES");
  url.searchParams.set("safesearch", "strict");   // ES: búsqueda segura para niños / EN: safe search for children

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": BRAVE_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search falló (${response.status})`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.web?.results) ? data.web.results : [];

  return results
    .slice(0, 3)
    .map((r) => `• ${r.title}: ${(r.description || "").slice(0, 200)}`)
    .join("\n");
}

// ── SerpAPI ──────────────────────────────────────────────────────────────
async function searchWithSerpApi(query) {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", SERPAPI_KEY);
  url.searchParams.set("hl", "es");
  url.searchParams.set("gl", "es");
  url.searchParams.set("num", "5");
  url.searchParams.set("safe", "active");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`SerpAPI falló (${response.status})`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.organic_results) ? data.organic_results : [];

  // ES: También capturar el snippet de "knowledge graph" si existe
  // EN: Also capture the knowledge graph snippet if present
  const kg = data?.knowledge_graph?.description || "";

  const snippets = results
    .slice(0, 3)
    .map((r) => `• ${r.title}: ${(r.snippet || "").slice(0, 200)}`);

  if (kg) snippets.unshift(`Resumen: ${kg.slice(0, 300)}`);

  return snippets.join("\n");
}

// ── DuckDuckGo Instant Answer (sin API key) ──────────────────────────────
// ES: API pública de DuckDuckGo. Solo devuelve resúmenes de Wikipedia
//     y paneles de conocimiento, no resultados de búsqueda completos.
//     Es el fallback cuando no hay keys configuradas.
// EN: DuckDuckGo public API. Only returns Wikipedia summaries and
//     knowledge panels, not full search results.
//     This is the fallback when no API keys are configured.
async function searchWithDDG(query) {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");
  url.searchParams.set("kp", "1");    // ES: SafeSearch activado / EN: SafeSearch on

  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo falló (${response.status})`);
  }

  const data = await response.json();
  const parts = [];

  // ES: Resumen del panel de conocimiento (Wikipedia, etc.)
  // EN: Knowledge panel summary (Wikipedia, etc.)
  if (typeof data?.AbstractText === "string" && data.AbstractText.trim()) {
    parts.push(data.AbstractText.slice(0, MAX_SNIPPET_CHARS));
  }

  // ES: Respuesta corta estilo "respuesta rápida"
  // EN: Short answer "quick answer" style
  if (typeof data?.Answer === "string" && data.Answer.trim()) {
    parts.unshift(data.Answer.slice(0, 300));
  }

  // ES: Resultados relacionados del panel lateral
  // EN: Related results from the side panel
  if (Array.isArray(data?.RelatedTopics)) {
    const extras = data.RelatedTopics
      .slice(0, 2)
      .filter((t) => typeof t?.Text === "string")
      .map((t) => `• ${t.Text.slice(0, 180)}`);
    parts.push(...extras);
  }

  return parts.join("\n").trim();
}

// ── Función principal de búsqueda / Main search function ─────────────────
// ES: Intenta buscar usando el proveedor más potente disponible.
//     Devuelve un string con los snippets o null si no hay resultados.
//     Nunca lanza excepción (la búsqueda fallida no debe romper el chat).
// EN: Tries to search using the most powerful available provider.
//     Returns a string with snippets, or null if no results found.
//     Never throws (a failed search must not break the chat flow).
async function webSearch(query) {
  // ES: Truncar la consulta para evitar URLs demasiado largas
  // EN: Truncate the query to avoid excessively long URLs
  const safeQuery = String(query || "").trim().slice(0, 300);
  if (!safeQuery) return null;

  try {
    let result = "";

    if (BRAVE_KEY) {
      result = await searchWithBrave(safeQuery);
    } else if (SERPAPI_KEY) {
      result = await searchWithSerpApi(safeQuery);
    } else {
      result = await searchWithDDG(safeQuery);
    }

    return result.trim() || null;
  } catch (err) {
    // ES: Registrar el error pero no propagar (búsqueda es un extra opcional)
    // EN: Log the error but don't propagate (search is an optional extra)
    console.warn("[WebSearch] Error al buscar:", err.message);
    return null;
  }
}

// ES: Extrae la mejor consulta de búsqueda del mensaje del usuario.
//     Elimina frases de relleno y verbos de petición.
// EN: Extracts the best search query from the user's message.
//     Removes filler phrases and request verbs.
function extractSearchQuery(text) {
  return text
    .replace(/^(busca|buscar|encuentra|dime|cuéntame|explícame|dime qué es|busca información sobre|investiga sobre|qué hay de)\s+/i, "")
    .replace(/\?$/g, "")
    .trim()
    .slice(0, 200);
}

export { webSearch, needsWebSearch, extractSearchQuery };
