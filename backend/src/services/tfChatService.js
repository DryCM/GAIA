/* ================================================================
   GaIA TF Chat Service / Servicio de Chat con TensorFlow
   ES: Motor de chat local impulsado por TF.js + búsqueda web.
       Algoritmo:
         1. Al arrancar construye un índice TF-IDF sobre la base de
            conocimientos educativos (GENERAL_KNOWLEDGE + SCHOOL_KNOWLEDGE).
         2. Cada consulta se vectoriza con el mismo vocabulario.
         3. Se calcula similitud de coseno con tf.matMul sobre tensores.
         4a. Si la confianza TF-IDF es alta (>= 0.45) → respuesta de la KB.
         4b. Si la confianza es baja (<0.45) → búsqueda web automática.
         5. Los resultados web se sintetizan localmente con un extractor
            de frases por relevancia (sin ninguna IA externa).
         6. La respuesta final se envuelve con la personalidad del modo.
       Sin IA externa. La red solo se usa para buscar datos actuales.
   EN: Local TF.js + web-search chat engine.
       Algorithm:
         1. At startup builds a TF-IDF index over the educational
            knowledge base (GENERAL_KNOWLEDGE + SCHOOL_KNOWLEDGE).
         2. Each query is vectorised with the same vocabulary.
         3. Cosine similarity is computed via tf.matMul on tensors.
         4a. If TF-IDF confidence is high (>= 0.45) → KB answer.
         4b. If confidence is low (<0.45) → automatic web search.
         5. Web results are synthesised locally with a sentence-
            relevance extractor (no external AI).
         6. Final answer is wrapped with the mode's personality.
       No external AI. The network is only used to fetch current data.
   ================================================================ */

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";
import { GENERAL_KNOWLEDGE, SCHOOL_KNOWLEDGE } from "./knowledgeService.js";
import { webSearch, extractSearchQuery } from "./webSearchService.js";

// ── Corpus ─────────────────────────────────────────────────────────────────
// ES: Combina todos los pares Q→A en un único array plano.
// EN: Merges all Q→A pairs into a single flat array.
const ALL_ITEMS = [
  ...GENERAL_KNOWLEDGE.map((e) => ({ q: e.q, a: e.a, topic: e.topic  })),
  ...SCHOOL_KNOWLEDGE .map((e) => ({ q: e.q, a: e.a, topic: e.subject})),
];

// ── Normalización de texto / Text normalisation ────────────────────────────
// ES: Elimina tildes, signos de puntuación y convierte a minúsculas.
//     Permite comparar "¿Cuántos…?" con "cuantos" sin penalizar.
// EN: Strips accents, punctuation and lowercases.
//     Lets "¿Cuántos…?" match "cuantos" without penalty.
function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[áàâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[¿¡]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ES: Palabras vacías en español que no aportan significado semántico.
// EN: Spanish stop-words that carry no semantic meaning.
const STOP_WORDS = new Set([
  "de","la","el","los","las","un","una","unos","unas","y","o","a","en",
  "es","se","que","con","por","para","al","del","lo","su","sus","le","les",
  "me","te","nos","mi","tu","si","no","ya","ha","han","hay","este","esta",
  "esto","ese","esa","eso","aqui","alli","como","cuando","donde","quien",
  "cual","cuales","son","fue","ser","esta","tiene","tienen","muy","mas",
  "pero","sino","aunque","porque","pues","asi","tanto","cada","otro","otra",
]);

// ES: Alias escolares comunes para ampliar la cobertura del índice TF-IDF.
// EN: Common school aliases to extend TF-IDF index coverage.
const ALIASES = new Map([
  ["mates",   "matematicas"],
  ["mate",    "matematica"],
  ["fisio",   "fisica"],
  ["quimi",   "quimica"],
  ["bio",     "biologia"],
  ["geo",     "geografia"],
  ["infor",   "informatica"],
  ["profe",   "profesor"],
  ["dino",    "dinosaurio"],
  ["dinos",   "dinosaurios"],
]);

function tokenise(text) {
  return normalise(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => ALIASES.get(w) ?? w);
}

// ── Índice TF-IDF / TF-IDF Index ──────────────────────────────────────────
// ES: Construido una sola vez al primer uso. Almacena:
//     - vocabulary  : array de tokens únicos del corpus
//     - idfArray    : array JS con el valor IDF de cada token
//     - kbTensor    : tensor [N, V] con vectores TF-IDF del corpus
// EN: Built once on first use. Stores:
//     - vocabulary  : array of unique corpus tokens
//     - idfArray    : JS array with the IDF value of each token
//     - kbTensor    : [N, V] tensor with corpus TF-IDF vectors
let vocabulary  = [];
let idfArray    = [];
let kbTensor    = null;

function buildIndex() {
  if (kbTensor) return;                       // ES: ya construido / EN: already built

  const N = ALL_ITEMS.length;

  // ES: Calcular frecuencia de documento (DF) para cada token.
  // EN: Compute document frequency (DF) for each token.
  const dfMap   = new Map();
  const docSets = ALL_ITEMS.map((item) => {
    const words = new Set(tokenise(item.q));
    words.forEach((w) => dfMap.set(w, (dfMap.get(w) || 0) + 1));
    return words;
  });

  vocabulary = [...dfMap.keys()];

  // ES: IDF suavizado: log((N+1)/(df+1)) + 1
  //     Penaliza tokens muy frecuentes, amplifica los específicos.
  // EN: Smoothed IDF: log((N+1)/(df+1)) + 1
  //     Penalises very common tokens, amplifies specific ones.
  idfArray = vocabulary.map((term) => {
    const df = dfMap.get(term) || 1;
    return Math.log((N + 1) / (df + 1)) + 1;
  });

  // ES: Construir la matriz del corpus [N, V] donde cada celda es el
  //     peso TF-IDF (binario TF × IDF) de ese token en esa pregunta.
  // EN: Build the corpus matrix [N, V] where each cell is the
  //     TF-IDF weight (binary TF × IDF) of that token in that question.
  const rows = docSets.map((wordSet) =>
    vocabulary.map((v, j) => (wordSet.has(v) ? idfArray[j] : 0))
  );

  kbTensor = tf.tensor2d(rows, [N, vocabulary.length], "float32");

  console.log(
    `[TF Chat] Índice listo: ${N} entradas, vocabulario ${vocabulary.length} tokens.`
  );
}

// ES: Convierte una consulta en un tensor [V] con pesos TF-IDF.
// EN: Converts a query into a [V] TF-IDF weight tensor.
function vectorise(text) {
  buildIndex();
  const words = new Set(tokenise(text));
  const vec   = vocabulary.map((v, j) => (words.has(v) ? idfArray[j] : 0));
  return tf.tensor1d(vec, "float32");
}

// ── Búsqueda semántica / Semantic search ──────────────────────────────────
// ES: Devuelve los K pares Q→A más similares a la consulta.
//     Similitud de coseno calculada con tf.matMul.
// EN: Returns the K Q→A pairs most similar to the query.
//     Cosine similarity computed with tf.matMul.
const MATCH_THRESHOLD = 0.18;   // ES: similitud mínima aceptable / EN: minimum acceptable similarity
const HIGH_CONFIDENCE  = 0.45;  // ES: umbral de alta confianza; por encima no se necesita web / EN: high-confidence threshold; above this no web search needed

function findMatches(query, topK = 3) {
  buildIndex();

  const queryVec = vectorise(query);              // [V]

  const scores = tf.tidy(() => {
    const qExp   = queryVec.expandDims(0);                            // [1, V]
    const dots   = tf.matMul(qExp, kbTensor, false, true).squeeze(); // [N]
    const qNorm  = tf.norm(queryVec);                                 // scalar
    const kNorms = tf.norm(kbTensor, 2, 1);                          // [N]
    const denom  = tf.maximum(kNorms.mul(qNorm), 1e-10);
    return dots.div(denom);                                           // [N]
  });

  const scoreValues = scores.arraySync();
  queryVec.dispose();
  scores.dispose();

  return scoreValues
    .map((score, i) => ({ score, item: ALL_ITEMS[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((m) => m.score >= MATCH_THRESHOLD);
}

// ── Síntesis extractiva local / Local extractive synthesis ────────────────
// ES: Dado el texto crudo de snippets web y la consulta original,
//     selecciona las frases más relevantes usando conteo de tokens
//     compartidos con la consulta. Sin IA externa.
//     Devuelve un párrafo legible de hasta ~500 caracteres.
// EN: Given raw web snippet text and the original query, selects
//     the most relevant sentences using shared-token counting against
//     the query. No external AI.
//     Returns a readable paragraph of up to ~500 characters.
function synthesizeFromWeb(query, snippets) {
  if (!snippets || !snippets.trim()) return null;

  const queryTokens = new Set(tokenise(query));

  // ES: Separar en oraciones por puntuación o saltos de línea.
  // EN: Split into sentences by punctuation or line breaks.
  const sentences = snippets
    .replace(/•/g, ".")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?:])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 450);

  if (sentences.length === 0) {
    // ES: Si no hay oraciones bien formadas, devolver el snippet acortado.
    // EN: If no well-formed sentences, return the snippet truncated.
    return snippets.replace(/•[^\n]*/g, "").trim().slice(0, 500) || null;
  }

  // ES: Puntuar cada oración por cantidad de tokens de la consulta que contiene.
  //     Las oraciones con más palabras clave de la pregunta son más relevantes.
  // EN: Score each sentence by how many query tokens it contains.
  //     Sentences with more question keywords are more relevant.
  const scored = sentences.map((s) => {
    const sTokens = new Set(tokenise(s));
    const overlap = [...queryTokens].filter((t) => sTokens.has(t)).length;
    return { s, score: overlap };
  });

  scored.sort((a, b) => b.score - a.score);

  // ES: Tomar las 3 frases más relevantes y ordenarlas por aparición original.
  // EN: Take the 3 most relevant sentences and reorder by original appearance.
  const topIndices = scored.slice(0, 3).map((x) => sentences.indexOf(x.s));
  topIndices.sort((a, b) => a - b);

  return topIndices
    .map((i) => sentences[i])
    .join(" ")
    .slice(0, 500);
}

// ── Plantillas de respuesta por modo / Mode response templates ─────────────
// ES: Cada modo tiene un conjunto de prefijos y sufijos que envuelven
//     la respuesta factual con la personalidad correspondiente.
// EN: Each mode has a set of prefixes and suffixes that wrap the
//     factual answer with its corresponding personality.
const MODE_TEMPLATES = {
  teacher: {
    prefix: [
      "¡Buena pregunta! ",
      "¡Me alegra que lo preguntes! ",
      "¡Qué curiosidad tan bonita! ",
      "¡Excelente! ",
    ],
    suffix: [
      " ¿Quieres saber más sobre esto?",
      " ¿Lo entendiste bien?",
      " ¿Tienes más preguntas?",
      " ¡Sigue preguntando, aprender es genial!",
    ],
  },
  friend: {
    prefix: [
      "¡Oye, eso es genial! ",
      "¡Qué pregunta tan chévere! ",
      "¡Eso me encanta! Mira: ",
      "¡Súper pregunta! ",
    ],
    suffix: [
      " ¡Cuéntame si lo sabías!",
      " ¿Sabías eso ya? 😄",
      " ¡Sigue así, campeón/campeona!",
      " ¿Quieres jugar a ver quién sabe más?",
    ],
  },
  storyteller: {
    prefix: [
      "¡Escucha esta historia fascinante! ",
      "Había una vez... ",
      "¡Déjame contarte algo increíble! ",
      "En un mundo lleno de misterios... ",
    ],
    suffix: [
      " ¡Y así fue como ocurrió!",
      " ¿No es una historia emocionante?",
      " ¡El mundo está lleno de aventuras así!",
      " ¡Y colorín colorado, este saber ha llegado!",
    ],
  },
  scientist: {
    prefix: [
      "¡Fascinante pregunta científica! Según mis investigaciones: ",
      "¡Laboratorio GaIA activado! El experimento dice: ",
      "¡Datos confirmados por la ciencia! ",
      "¡Hipótesis verificada! Resultado: ",
    ],
    suffix: [
      " ¿Quieres que te proponga un experimento casero para comprobarlo?",
      " ¡La ciencia nunca deja de sorprendernos!",
      " ¿Qué más te gustaría investigar?",
      " ¡Apúntalo en tu cuaderno de científico!",
    ],
  },
  adventurer: {
    prefix: [
      "¡Misión de conocimiento aceptada! Descubrimos que: ",
      "¡Explorando el mundo del saber! Hallazgo: ",
      "¡Expedición GaIA en marcha! El mapa revela: ",
      "¡Aventurero/a, presta atención! ",
    ],
    suffix: [
      " ¡Misión completada con éxito!",
      " ¿Listo/a para la siguiente aventura del conocimiento?",
      " ¡Marca esto en tu mapa del saber!",
      " ¡Explora más y conquista el conocimiento!",
    ],
  },
  comedian: {
    prefix: [
      "¡Tachán! Aquí viene la respuesta: ",
      "¡Pregunta recibida, risas activadas! Resulta que... ",
      "¡Redoble de tambores... bom bom bom! ",
      "¡El payaso sabe la respuesta! Escucha: ",
    ],
    suffix: [
      " ¡Eso sí que es para alucinar!",
      " ¿A qué no lo sabías? ¡Tachán!",
      " ¡Y ahora una adivinanza: qué tiene cuatro ruedas y vuela? ¡Un camión de moscas! 🤡",
      " ¡El conocimiento es la mejor broma del universo!",
    ],
  },
  poet: {
    prefix: [
      "Con rimas y alegría, \nla respuesta es esta, vida mía:\n",
      "Escucha bien, pequeño/a aprendiz,\nla ciencia lo dice feliz:\n",
      "En versos te lo contaré,\npara que nunca lo olvidaré:\n",
      "Con palabras que riman bien,\nla respuesta llega también:\n",
    ],
    suffix: [
      "\n¡Y así lo dice la verdad, con toda felicidad!",
      "\n¡Que el saber sea tu canción, llena de emoción!",
      "\n¡Rima, aprende y salta sin parar, que es hora de disfrutar!",
      "\n¡Y punto final con un corazón, lleno de información!",
    ],
  },
};

// ES: Respuestas sociales predefinidas. Se devuelven SIN plantilla de modo
//     para mantener la naturalidad conversacional.
// EN: Predefined social replies. Returned WITHOUT mode template to keep
//     conversational naturalness.
const SOCIAL_PATTERNS = [
  // Saludos / Greetings
  {
    pattern: /^(hola|hey|buenas|buenos dias|buenas tardes|buenas noches|ey|holi|ola)\b/i,
    replies: [
      "¡Hola! Soy tu asistente de aprendizaje. ¿Qué quieres descubrir hoy?",
      "¡Hola! ¿Lista/o para aprender algo increíble?",
      "¡Buenas! Estoy aquí para ayudarte. ¿Sobre qué quieres saber?",
    ],
  },
  // Estado / How are you
  {
    pattern: /^(como estas|que tal|todo bien|como andas|que hay|como te va|como estas hoy)\b/i,
    replies: [
      "¡Muy bien, gracias por preguntar! Estoy lista para aprender contigo. ¿Qué quieres descubrir hoy?",
      "¡Genial y con muchas ganas de ayudarte! ¿Sobre qué tema quieres charlar?",
      "¡Estupenda! Lista para enseñarte cosas chulas. ¿Qué te gustaría aprender?",
    ],
  },
  // Despedidas / Farewells
  {
    pattern: /^(adios|hasta luego|bye|chao|nos vemos|hasta pronto|hasta manana|chau)\b/i,
    replies: [
      "¡Hasta pronto! Sigue siendo curioso/a. 👋",
      "¡Adiós! ¡Vuelve cuando quieras aprender más!",
      "¡Hasta luego! Recuerda: cada pregunta te hace más inteligente.",
    ],
  },
  // Agradecimientos / Thanks
  {
    pattern: /^(gracias|muchas gracias|thank you|genial|perfecto|guay|chevere|ok gracias|super|estupendo)\b/i,
    replies: [
      "¡De nada! ¿Hay algo más que quieras aprender?",
      "¡Con mucho gusto! Pregúntame lo que quieras.",
      "¡Me alegra haberte ayudado! ¿Seguimos aprendiendo?",
    ],
  },
  // Identidad / Identity
  {
    pattern: /^(quien eres|que eres|como te llamas|eres una ia|eres un robot|quien soy hablando|con quien hablo)\b/i,
    replies: [
      "Soy tu asistente de aprendizaje inteligente, funcionando con TensorFlow directamente en tu dispositivo. Busco en internet cuando no sé algo y te respondo sin depender de otras IAs. ¿Qué quieres descubrir?",
      "Soy una IA educativa local hecha con TensorFlow. Sin servidores de IA externos, sin esperas. Cuando no sé algo, lo busco en internet y razona sola. ¿Qué quieres aprender?",
    ],
  },
  // Chistes / Jokes
  {
    pattern: /\b(ch?iste|broma|hazme reir|algo gracioso|cuéntame algo gracioso|dime algo divertido|cuéntame un chiste|dime un chiste|cuenta un chiste)\b/i,
    replies: [
      "¿Por qué el libro de matemáticas estaba triste? ¡Porque tenía demasiados problemas! 😄",
      "¿Qué le dice un semáforo a otro? ¡No me mires, me estoy cambiando! 🚦",
      "¿Por qué los pájaros vuelan hacia el sur en invierno? ¡Porque caminando tardarían demasiado! 🐦",
      "¿Qué hace una abeja en el gimnasio? ¡Zum-ba! 🐝",
      "¿Cuál es el colmo de un jardinero? ¡Que su hijo se llame Jacinto! 🌱",
      "¿Por qué el esqueleto no fue a la fiesta? ¡Porque no tenía cuerpo para ir! 💀",
    ],
  },
  // Cuentos / Stories
  {
    pattern: /\b(cu[eé]ntame un cuento|cuenta un cuento|d[ií]me un cuento|historia para dormir|cuento corto|dime una historia|inventate un cuento)\b/i,
    replies: [
      "Érase una vez un pequeño dragón llamado Chispa que tenía miedo de escupir fuego. Un día un grillo sabio le dijo: '¡El miedo no te hace pequeño, te hace valiente cuando lo superas!' Chispa respiró hondo, sopló con fuerza... ¡y encendió las estrellas del cielo! FIN 🌟",
      "En un bosque muy lejano vivía una tortuga llamada Lenta que quería ganar una carrera. Todos se reían, pero ella entrenó cada día sin rendirse. El día de la carrera, cuando todos dormían, Lenta llegó primera. ¡La constancia siempre gana! 🐢",
      "Una estrella pequeñita llamada Brilli se sentía invisible porque las demás brillaban más. Hasta que una noche una niña la señaló y dijo: '¡Esa es mi favorita!' Brilli entendió que no necesitas ser la más grande para ser especial. ✨",
      "Había una vez un robot llamado Bip que quería aprender a pintar. Sus amigos le decían que los robots no podían pintar. Pero Bip practicó cada día, mezcló colores y creó cuadros preciosos. ¡Nunca dejes de intentarlo! 🤖🎨",
    ],
  },
  // Poemas / Poems
  {
    pattern: /\b(d[ií]me un poema|cu[eé]ntame un poema|recita|poesia|rima|dime una rima)\b/i,
    replies: [
      "El sol sale cada mañana\ny tiñe el cielo de colores,\ncomo tú, que con tus preguntas\nllenas el mundo de sabores. 🌅",
      "Uno más uno son dos,\ndos más dos son cuatro ya,\ny aprender con alegría\nes la mejor magia que hay. ✨",
      "El océano guarda secretos\nen cada ola y en cada pez,\nel que pregunta con curiosidad\ndescubre el mundo una y otra vez. 🌊",
    ],
  },
];

// ES: Respuestas de "no encontré información" para cuando la similitud es baja.
// EN: "Not found" replies for when similarity is too low.
const NOT_FOUND_REPLIES = [
  "Mmm, esa pregunta está un poco fuera de mi biblioteca actual. ¡Pero puedes preguntarme sobre animales, espacio, ciencias, matemáticas, historia, idiomas y mucho más!",
  "¡Esa es una pregunta muy interesante! Por ahora no tengo esa información exacta en mi base de conocimientos. ¿Me preguntas sobre algo de ciencias, naturaleza o cultura general?",
  "No encontré información exacta sobre eso. ¡Pero tengo datos curiosos sobre el espacio, los animales, el cuerpo humano, matemáticas y más! ¿Qué tema te gusta?",
  "Esa información no está en mi biblioteca todavía. ¡Prueba preguntándome sobre planetas, dinosaurios, el cuerpo humano, fracciones o el idioma inglés!",
];

// ── Detección de seguimiento / Follow-up detection ───────────────────────
// ES: Detecta mensajes de tipo "cuentame más", "continua", "quiero saber más de eso".
//     Cuando se detectan, se reutiliza el último tema del historial.
// EN: Detects "tell me more", "continue", "I want to know more about that" messages.
//     When detected, the last history topic is reused as the effective query.
const FOLLOWUP_PATTERNS = [
  /^(cu[eé]ntame m[aá]s|dime m[aá]s|qu[eé] m[aá]s)\b/i,
  /^(m[aá]s (sobre|de|acerca))\b/i,
  /^(sigue|contin[uú]a|adelante|y (qu[eé]|c[oó]mo))\b/i,
  /\b(quiero saber m[aá]s|m[aá]s informaci[oó]n|m[aá]s detalles)\b/i,
  /\b(de eso|sobre eso|del tema|de lo mismo|m[aá]s de eso)\b/i,
  /^(explica m[aá]s|ampl[ií]a|profundiza|desarrolla)\b/i,
  /^(y qu[eé] m[aá]s|c[oó]mo es eso|por qu[eé] eso)\b/i,
];

function isFollowUp(text) {
  return FOLLOWUP_PATTERNS.some((p) => p.test(text.trim()));
}

// ES: Extrae el último tema significativo del historial de chat.
//     Va hacia atrás buscando el último mensaje de usuario que no sea seguimiento.
// EN: Extracts the last significant topic from chat history.
//     Goes backwards looking for the last non-follow-up user message.
function extractLastTopic(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === "user" && typeof msg.text === "string") {
      const t = msg.text.trim();
      const norm = normalise(t);
      if (!isFollowUp(norm) && t.length > 4) return t;
    }
  }
  return null;
}

// ── Detección de seguimiento / Follow-up detection ────────────────────────
// ES: Detecta mensajes de tipo "cuentame más", "continua", "quiero saber más".
// EN: Detects "tell me more", "continue", "I want to know more" messages.
const FOLLOWUP_PATTERNS = [
  /^(cu[eé]ntame m[aá]s|dime m[aá]s|qu[eé] m[aá]s)\b/i,
  /^(m[aá]s (sobre|de|acerca))\b/i,
  /^(sigue|contin[uú]a|adelante)\b/i,
  /\b(quiero saber m[aá]s|m[aá]s informaci[oó]n|m[aá]s detalles)\b/i,
  /\b(de eso|sobre eso|del tema|de lo mismo|m[aá]s de eso)\b/i,
  /^(explica m[aá]s|ampl[ií]a|profundiza|desarrolla)\b/i,
  /^(y qu[eé] m[aá]s|c[oó]mo es eso|por qu[eé] eso)\b/i,
];

function isFollowUp(text) {
  return FOLLOWUP_PATTERNS.some((p) => p.test(text.trim()));
}

// ES: Extrae el último tema significativo del historial de chat.
// EN: Extracts the last significant topic from chat history.
function extractLastTopic(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === "user" && typeof msg.text === "string") {
      const t = msg.text.trim();
      if (!isFollowUp(normalise(t)) && t.length > 4) return t;
    }
  }
  return null;
}

// ── Funciones auxiliares / Helper functions ───────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ES: Rastrea el orden de uso de prefijos/sufijos por modo para evitar
//     repetir la misma frase seguida.
// EN: Tracks prefix/suffix usage order per mode to avoid repeating
//     the same phrase back-to-back.
const modeRotators = {};
function rotatePick(arr, stateKey) {
  if (!modeRotators[stateKey]) {
    const order = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
    modeRotators[stateKey] = { order, idx: 0 };
  }
  const state = modeRotators[stateKey];
  const result = arr[state.order[state.idx] ?? 0] ?? arr[0];
  state.idx = (state.idx + 1) % arr.length;
  if (state.idx === 0) {
    // Re-shuffle after exhausting all options
    state.order = arr.map((_, i) => i).sort(() => Math.random() - 0.5);
  }
  return result;
}

function wrapWithMode(rawAnswer, mode) {
  const tpl = MODE_TEMPLATES[mode] || MODE_TEMPLATES.teacher;
  return `${rotatePick(tpl.prefix, `${mode}-prefix`)}${rawAnswer}${rotatePick(tpl.suffix, `${mode}-suffix`)}`;
}

// ── Función principal de chat / Main chat function ────────────────────────
// ES: Recibe el texto del usuario y el modo; devuelve { answer, webSearchUsed }.
//     Flujo:
//       1. Verificar si es un mensaje social (saludo, gracias, etc.)
//       2. Buscar en la KB por similitud semántica TF.js
//       3a. Score >= HIGH_CONFIDENCE → respuesta KB, sin búsqueda web
//       3b. Score < HIGH_CONFIDENCE  → búsqueda web automática
//       4. Sintetizar resultados web localmente (sin IA externa)
//       5. Si la web no devuelve nada → KB o "no encontré"
//       6. Envolver respuesta con la plantilla del modo elegido
// EN: Receives user text and mode; returns { answer, webSearchUsed }.
//     Flow:
//       1. Check if it's a social message (greeting, thanks, etc.)
//       2. Search the KB via TF.js semantic similarity
//       3a. Score >= HIGH_CONFIDENCE → KB answer, no web search
//       3b. Score < HIGH_CONFIDENCE  → automatic web search
//       4. Synthesise web results locally (no external AI)
//       5. If web returns nothing → KB or "not found"
//       6. Wrap response with the chosen mode template
async function tfChat({ text, mode = "teacher", history = [] }) {
  buildIndex();   // ES: idempotente, solo construye una vez / EN: idempotent, builds once

  const normText = normalise(text);

  // ── 1. Respuestas sociales / Social replies ────────────────────────────
  // ES: Se devuelven SIN plantilla de modo para evitar prefijos incongruentes
  //     como '¡Buena pregunta!' ante un saludo, un chiste o un poema.
  // EN: Returned WITHOUT mode template to avoid incongruent prefixes
  //     like '¡Buena pregunta!' for a greeting, joke or poem.
  for (const { pattern, replies } of SOCIAL_PATTERNS) {
    if (pattern.test(normText)) {
      return { answer: pick(replies), webSearchUsed: false };
    }
  }

  // ── 1.5. Preguntas de seguimiento / Follow-up questions ───────────────
  // ES: Si el usuario pide "más" sobre el tema anterior, buscamos el último
  //     tema real del historial y lo usamos como consulta efectiva.
  // EN: If the user asks for "more" or "continue", find the last real
  //     topic in history and use it as the effective query.
  let effectiveText = text;
  if (isFollowUp(normText) && history.length > 0) {
    const lastTopic = extractLastTopic(history);
    if (lastTopic) effectiveText = lastTopic;
  }

  // ── 2. Búsqueda semántica TF.js / TF.js semantic search ───────────────
  const matches = findMatches(effectiveText, 3);
  const bestScore = matches.length > 0 ? matches[0].score : 0;

  // ── 3a. Alta confianza → responder desde la base de conocimientos ──────
  // ES: Si el índice TF-IDF tiene mucha confianza en la respuesta,
  //     la devuelve directamente sin necesitar internet.
  // EN: If the TF-IDF index has high confidence in the answer,
  //     return it directly without needing the internet.
  if (bestScore >= HIGH_CONFIDENCE) {
    let kbAnswer = matches[0].item.a;

    if (
      matches.length > 1 &&
      matches[1].score >= bestScore * 0.80 &&
      matches[1].item.topic !== matches[0].item.topic
    ) {
      kbAnswer += ` Además: ${matches[1].item.a}`;
    }

    return { answer: wrapWithMode(kbAnswer, mode), webSearchUsed: false };
  }

  // ── 3b. Confianza baja → búsqueda web automática ──────────────────────
  const searchQuery = extractSearchQuery(effectiveText);

  let webRaw = null;
  try {
    webRaw = await webSearch(searchQuery);
  } catch {
    // ES: Si la búsqueda falla, continuar con lo que tenemos.
    // EN: If the search fails, continue with what we have.
  }

  const webSynthesis = synthesizeFromWeb(searchQuery, webRaw);

  if (webSynthesis) {
    // ES: Construir respuesta combinando síntesis web con el KB si hay match medio.
    // EN: Build response combining web synthesis with KB if there's a medium match.
    let combinedAnswer = webSynthesis;

    if (bestScore >= MATCH_THRESHOLD && matches[0].item.a) {
      combinedAnswer = `${matches[0].item.a} ${webSynthesis}`;
    }

    return { answer: wrapWithMode(combinedAnswer, mode), webSearchUsed: true };
  }

  // ── 4. Fallback: KB con score medio o "no encontré" ───────────────────
  // ES: Si la web no devolvió nada, usar el mejor match de la KB si existe.
  // EN: If web returned nothing, use the best KB match if it exists.
  if (matches.length > 0 && bestScore >= MATCH_THRESHOLD) {
    return { answer: wrapWithMode(matches[0].item.a, mode), webSearchUsed: false };
  }

  return { answer: wrapWithMode(pick(NOT_FOUND_REPLIES), mode), webSearchUsed: false };
}

// ES: Inicializar el índice en background al importar el módulo para
//     que la primera petición real no sufra latencia de construcción.
// EN: Initialise the index in the background on import so the first
//     real request does not suffer the build latency.
setImmediate(() => {
  try {
    buildIndex();
  } catch (err) {
    console.warn("[TF Chat] No se pudo pre-construir el índice:", err.message);
  }
});

export { tfChat };
