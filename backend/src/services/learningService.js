// ================================================================
// ES: Se usa @tensorflow/tfjs con el backend CPU puro para que
//     TensorFlow funcione en Node.js sin dependencias nativas.
// EN: Using @tensorflow/tfjs with the pure CPU backend so
//     TensorFlow works in Node.js without native bindings.
// ================================================================
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-cpu";

/* ================================================================
   GaIA Learning Service – TensorFlow.js (Node)
   ES: Motor de aprendizaje: detecta intereses, clasifica mensajes,
       cachea respuestas y personaliza prompts por edad.
   EN: Learning engine: detects interests, classifies messages,
       caches responses and personalises prompts by age group.
   ================================================================ */

// ── Categorías de interés / Interest categories ───────────────
const INTEREST_CATEGORIES = [
  "animales",
  "deportes",
  "musica",
  "arte",
  "ciencia",
  "juegos",
  "naturaleza",
  "comida",
  "fantasia",
  "tecnologia",
  "peliculas",
  "cuentos",
];

// ES: Palabras clave por categoría. Si el mensaje del niño contiene
//     alguna de estas palabras, sumamos 1 punto a esa categoría.
// EN: Keywords per category. If the child's message contains any of
//     these words, we add 1 point to that category score.
const CATEGORY_KEYWORDS = {
  animales: [
    "perro", "gato", "animal", "mascota", "dinosaurio", "pajaro", "pez",
    "caballo", "leon", "tigre", "elefante", "conejo", "tortuga", "delfin",
    "ballena", "mono", "oso", "serpiente", "insecto", "mariposa", "loro",
    "hamster", "pato", "vaca", "oveja", "cerdo", "jirafa", "cocodrilo",
    "tiburon", "aguila", "lobo", "zorro", "raton", "abeja", "hormiga",
  ],
  deportes: [
    "futbol", "basket", "nadar", "correr", "pelota", "gol", "equipo",
    "partido", "deporte", "bicicleta", "patinar", "saltar", "baloncesto",
    "tenis", "natacion", "atletismo", "gimnasia", "karate", "balon",
    "campeon", "medalla", "entrenamiento",
  ],
  musica: [
    "cancion", "cantar", "musica", "instrumento", "guitarra", "piano",
    "bateria", "bailar", "baile", "ritmo", "melodia", "nota", "cantante",
    "banda", "rock", "pop", "flauta", "violin", "tambor", "coro",
  ],
  arte: [
    "dibujar", "pintar", "color", "dibujo", "pintura", "arte", "colorear",
    "crayon", "lapiz", "papel", "manualidad", "crear", "creatividad",
    "escultura", "collage", "acuarela", "plastilina", "origami", "recortar",
  ],
  ciencia: [
    "planeta", "espacio", "estrella", "luna", "sol", "ciencia", "experimento",
    "quimica", "fisica", "robot", "atomo", "energia", "volcan", "terremoto",
    "galaxia", "telescopio", "microscopio", "laboratorio", "inventor",
    "matematica", "numero", "dinosaurio", "fosil",
  ],
  juegos: [
    "juego", "jugar", "minecraft", "roblox", "videojuego", "consola",
    "nivel", "ganar", "perder", "puzzle", "lego", "muneco", "juguete",
    "dado", "carta", "tablero", "fortnite", "mario", "pokemon", "sonic",
    "zelda", "ajedrez",
  ],
  naturaleza: [
    "arbol", "flor", "planta", "bosque", "rio", "montana", "mar", "playa",
    "jardin", "semilla", "hoja", "lluvia", "nieve", "nube", "tierra",
    "campo", "selva", "desierto", "lago", "cascada", "oceano",
  ],
  comida: [
    "comida", "cocinar", "receta", "pastel", "pizza", "helado", "fruta",
    "verdura", "chocolate", "galleta", "dulce", "comer", "desayuno",
    "almuerzo", "cena", "merienda", "jugo", "leche", "sopa", "sandwich",
    "tarta", "pan", "arroz", "pollo",
  ],
  fantasia: [
    "dragon", "magia", "hada", "unicornio", "princesa", "principe",
    "castillo", "mago", "bruja", "hechizo", "aventura", "tesoro", "pirata",
    "superheroe", "poder", "varita", "encantado", "reino", "sirena",
    "duende", "elfo", "fantasma", "monstruo",
  ],
  tecnologia: [
    "computadora", "tablet", "telefono", "internet", "programar", "codigo",
    "app", "robot", "inteligencia", "artificial", "nave", "cohete",
    "invento", "maquina", "electronica", "drone", "impresora", "3d",
    "videollamada",
  ],
  peliculas: [
    "pelicula", "serie", "dibujos", "animados", "disney", "pixar",
    "personaje", "heroe", "villano", "anime", "cartoon", "tele", "cine",
    "actor", "historia", "marvel", "spiderman", "batman",
  ],
  cuentos: [
    "cuento", "libro", "leer", "historia", "lectura", "pagina", "escribir",
    "poema", "fabula", "leyenda", "autor", "biblioteca", "comic", "manga",
    "novela", "capitulo", "narrar",
  ],
};

// ── Palabras clave de creatividad / Creativity keywords ─────────
// ES: Si el mensaje contiene estas palabras, el niño está siendo
//     creativo (inventando, dibujando, creando). Score: 0.0 – 1.0.
// EN: If the message contains these words the child is being
//     creative (inventing, drawing, creating). Score: 0.0 – 1.0.
const CREATIVITY_KEYWORDS = [
  "invente", "imagine", "cree", "dibuje", "escribi", "mi historia",
  "mi cuento", "hice", "construi", "mi idea", "se me ocurrio",
  "que tal si", "podriamos", "inventar", "crear", "imaginar",
  "mi dibujo", "mi cancion", "mi poema", "mi juego", "invento",
  "disenando", "construyendo", "creando",
];

// ── Configuración por edad / Age-group configuration ────────────
// ES: Define vocabulario, tono, límite de frases y temas bloqueados
//     para cada grupo de edad (preescolar, escolar, pre-adolescente).
// EN: Defines vocabulary, tone, sentence limit and blocked topics
//     for each age group (preschool, school-age, pre-teen).
const AGE_GROUPS = {
  "3-5": {
    label: "preescolar",
    maxResponseSentences: 2,
    vocabulary: "muy simple, frases cortas de 5-8 palabras",
    censorLevel: "estricto",
    blockedTopics: [
      "violencia", "muerte", "miedo", "romance", "guerra", "sangre",
      "armas", "drogas", "alcohol", "terror", "pesadilla",
    ],
    tone: "muy dulce y jugueton, con muchas exclamaciones positivas",
  },
  "6-8": {
    label: "escolar temprano",
    maxResponseSentences: 3,
    vocabulary: "simple y claro",
    censorLevel: "moderado",
    blockedTopics: [
      "violencia explicita", "romance", "guerra detallada", "drogas",
      "alcohol", "armas", "contenido adulto",
    ],
    tone: "amigable y educativo, con ejemplos cotidianos",
  },
  "9-12": {
    label: "pre-adolescente",
    maxResponseSentences: 4,
    vocabulary: "normal, puede incluir terminos nuevos explicados",
    censorLevel: "ligero",
    blockedTopics: [
      "contenido adulto", "drogas", "alcohol", "violencia grafica",
    ],
    tone: "cercano y respetuoso, como un hermano mayor",
  },
};

// ES: Devuelve la configuración de grupo de edad correcta.
//     Por defecto usa el grupo más pequeño si la edad es inválida.
// EN: Returns the correct age-group config.
//     Defaults to the youngest group when age is invalid.
function getAgeGroup(age) {
  const n = parseInt(age, 10);
  if (isNaN(n) || n < 3) return AGE_GROUPS["3-5"];
  if (n <= 5) return AGE_GROUPS["3-5"];
  if (n <= 8) return AGE_GROUPS["6-8"];
  return AGE_GROUPS["9-12"];
}

// ── Normalización de texto / Text normalisation ──────────────────
// ES: Convierte el texto a minúsculas, elimina acentos y caracteres
//     especiales para comparaciones más robustas.
// EN: Lowercases text, strips accents and special characters
//     for more robust comparisons.
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // ES: eliminar tildes / EN: strip diacritics
    .replace(/[^a-z0-9\s]/g, " ")      // ES: eliminar puntuación / EN: strip punctuation
    .replace(/\s+/g, " ")              // ES: colapsar espacios / EN: collapse spaces
    .trim();
}

// ES: Divide el texto normalizado en palabras de longitud > 1.
// EN: Splits the normalised text into words with length > 1.
function tokenize(text) {
  return normalizeText(text).split(" ").filter((w) => w.length > 1);
}

// ── Detección de intereses por palabras clave / Keyword interest detection ──
// ES: Puntúa cada categoría comparando las palabras del mensaje con
//     la lista de palabras clave. Rápido, disponible desde el primer
//     mensaje (sin necesitar datos de entrenamiento).
// EN: Scores each category by matching message words against the
//     keyword lists. Fast, available from message #1 (no training
//     data needed).
function detectInterests(text) {
  const words = tokenize(text);
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const word of words) {
      for (const kw of keywords) {
        // ES: Coincidencia parcial en ambas direcciones (substring)
        // EN: Partial match in both directions (substring)
        if (word.includes(kw) || kw.includes(word)) {
          score++;
        }
      }
    }
    if (score > 0) {
      scores[category] = score;
    }
  }

  return scores;
}

// ── Detección de creatividad / Creativity detection ──────────────
// ES: Cada palabra clave de creatividad detectada suma 0.2 al score.
//     El resultado se limita a 1.0 (máximo).
// EN: Each detected creativity keyword adds 0.2 to the score.
//     Result is capped at 1.0 (maximum).
function detectCreativity(text) {
  const normalized = normalizeText(text);
  let score = 0;
  for (const kw of CREATIVITY_KEYWORDS) {
    if (normalized.includes(kw)) score += 0.2;
  }
  return Math.min(score, 1.0);
}

// ── Caché de respuestas / Response cache ──────────────────────────
// ES: Evita llamadas repetidas a la IA para preguntas similares.
//     Usa coincidencia exacta y difusa (Jaccard > 85%) para reutilizar
//     respuestas guardadas. Expulsa la entrada menos usada cuando está llena.
// EN: Avoids repeated AI calls for similar questions.
//     Uses exact and fuzzy (Jaccard > 85%) matching to reuse cached
//     responses. Evicts the least-used entry when full.
class ResponseCache {
  // ES: maxSize – número máximo de entradas en caché (por defecto 500)
  // EN: maxSize – maximum number of cache entries (default 500)
  constructor(maxSize = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  // ES: Genera la clave normalizada para buscar en el mapa.
  // EN: Generates the normalised key used to look up in the map.
  _key(text) {
    return normalizeText(text);
  }

  // ES: Calcula la similitud Jaccard entre dos textos (0 = nada, 1 = igual).
  // EN: Calculates Jaccard similarity between two texts (0 = none, 1 = equal).
  _similarity(a, b) {
    const wordsA = new Set(tokenize(a));
    const wordsB = new Set(tokenize(b));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) intersection++;
    }
    return intersection / Math.max(wordsA.size, wordsB.size);
  }

  // ES: Obtiene una respuesta cacheada. Primero intenta exacta, luego difusa.
  // EN: Gets a cached response. Tries exact match first, then fuzzy.
  get(text) {
    const key = this._key(text);

    // ES: Coincidencia exacta / EN: Exact match
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      entry.hits++;
      return entry.answer;
    }

    // ES: Coincidencia difusa (>85% similar) / EN: Fuzzy match (>85% similar)
    let bestMatch = null;
    let bestScore = 0;

    for (const [cachedKey, entry] of this.cache) {
      const score = this._similarity(key, cachedKey);
      if (score > 0.85 && score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hits++;
      return bestMatch.answer;
    }

    return null;
  }

  // ES: Guarda una nueva respuesta en la caché.
  //     Si está llena, expulsa la entrada con menos usos.
  // EN: Stores a new response in the cache.
  //     If full, evicts the entry with the fewest hits.
  set(text, answer) {
    const key = this._key(text);

    // ES: Expulsar menos usado cuando la caché está llena
    // EN: Evict least-used when cache is full
    if (this.cache.size >= this.maxSize) {
      let leastKey = null;
      let leastHits = Infinity;
      for (const [k, v] of this.cache) {
        if (v.hits < leastHits) {
          leastHits = v.hits;
          leastKey = k;
        }
      }
      if (leastKey) this.cache.delete(leastKey);
    }

    this.cache.set(key, { answer, hits: 1, createdAt: Date.now() });
  }

  // ES: Número actual de entradas en la caché.
  // EN: Current number of entries in the cache.
  get size() {
    return this.cache.size;
  }
}

// ── Modelo TensorFlow.js / TensorFlow.js Model ──────────────────
// ES: Red neuronal que aprende a clasificar mensajes en categorías
//     de interés con el tiempo. Empieza vacía y se entrena
//     automáticamente cuando hay suficientes muestras (≥20).
//     Usa @tensorflow/tfjs-node (bindings nativos C++) para
//     rendimiento óptimo en Node.js.
// EN: Neural network that learns to classify messages into interest
//     categories over time. Starts empty and trains automatically
//     once enough samples are collected (≥20).
//     Uses @tensorflow/tfjs-node (native C++ bindings) for optimal
//     performance in Node.js.

// ES: Indicador de si TF se cargó correctamente (puede fallar en
//     algunos entornos sin los binarios nativos compilados).
// EN: Flag indicating whether TF loaded successfully (can fail in
//     some environments without compiled native binaries).
let tfAvailable = true;
try {
  // ES: Verificar que TF está operativo ejecutando una operación trivial.
  // EN: Verify TF is operational by running a trivial operation.
  tf.scalar(1).dispose();
} catch (initErr) {
  tfAvailable = false;
  console.warn(
    "[GaIA Learning] TensorFlow no está disponible en este entorno. " +
    "El aprendizaje con IA usará solo palabras clave hasta que se " +
    "instalen los binarios nativos (@tensorflow/tfjs-node).\n" +
    "[GaIA Learning] TensorFlow is not available in this environment. " +
    "AI learning will use keywords only until native binaries are " +
    "installed (@tensorflow/tfjs-node). Error: " + initErr.message
  );
}

let model = null;                    // ES: Modelo entrenado (null = aún no entrenado) / EN: Trained model (null = not yet trained)
const vocabulary = new Map();        // ES: Índice palabra→posición en vector / EN: Word→vector-position index
const trainingData = [];             // ES: Historial de mensajes + categoría / EN: History of messages + category
const MIN_TRAINING_SAMPLES = 20;     // ES: Mínimo de muestras para entrenar / EN: Minimum samples needed to train
const VOCAB_SIZE = 500;              // ES: Tamaño del vocabulario del vector / EN: Vocabulary/vector size

// ES: Construye el vocabulario con las VOCAB_SIZE palabras más frecuentes.
// EN: Builds vocabulary from the VOCAB_SIZE most frequent words.
function buildVocabulary(texts) {
  const wordCounts = {};
  for (const text of texts) {
    for (const word of tokenize(text)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  const sorted = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, VOCAB_SIZE);

  vocabulary.clear();
  sorted.forEach(([word], i) => vocabulary.set(word, i));
}

// ES: Convierte un texto en un vector bag-of-words de VOCAB_SIZE posiciones.
// EN: Converts text into a bag-of-words vector of VOCAB_SIZE positions.
function textToVector(text) {
  const vec = new Float32Array(VOCAB_SIZE).fill(0);
  for (const word of tokenize(text)) {
    const idx = vocabulary.get(word);
    if (idx !== undefined) vec[idx] = 1;  // ES: 1 si la palabra está presente / EN: 1 if word is present
  }
  return vec;
}

// ES: Entrena la red neuronal con los datos acumulados.
//     Arquitectura: Dense(64, ReLU) → Dropout(0.3) → Dense(N_categorías, Softmax)
//     Optimizador: Adam (lr=0.01), Loss: Entropía cruzada categórica.
//     Devuelve false si no hay suficientes muestras o TF no está disponible.
// EN: Trains the neural network with accumulated data.
//     Architecture: Dense(64, ReLU) → Dropout(0.3) → Dense(N_categories, Softmax)
//     Optimizer: Adam (lr=0.01), Loss: Categorical cross-entropy.
//     Returns false if not enough samples or TF is unavailable.
async function trainModel() {
  if (!tfAvailable) return false;       // ES: TF no disponible, saltar / EN: TF unavailable, skip
  if (trainingData.length < MIN_TRAINING_SAMPLES) return false;

  // ES: Construir vocabulario con todos los textos vistos
  // EN: Build vocabulary from all seen texts
  buildVocabulary(trainingData.map((d) => d.text));

  // ES: Convertir textos a vectores numéricos
  // EN: Convert texts to numeric vectors
  const xs = trainingData.map((d) => textToVector(d.text));

  // ES: Convertir categorías a vectores one-hot
  // EN: Convert categories to one-hot vectors
  const ys = trainingData.map((d) => {
    const idx = INTEREST_CATEGORIES.indexOf(d.category);
    const vec = new Float32Array(INTEREST_CATEGORIES.length).fill(0);
    if (idx >= 0) vec[idx] = 1;
    return vec;
  });

  // ES: Crear tensores de entrenamiento
  // EN: Create training tensors
  const xsTensor = tf.tensor2d(xs);
  const ysTensor = tf.tensor2d(ys);

  // ES: Liberar modelo anterior para evitar fugas de memoria
  // EN: Dispose previous model to avoid memory leaks
  if (model) model.dispose();

  // ES: Definir arquitectura de la red neuronal
  // EN: Define neural network architecture
  model = tf.sequential();
  model.add(
    tf.layers.dense({ inputShape: [VOCAB_SIZE], units: 64, activation: "relu" })
  );
  model.add(tf.layers.dropout({ rate: 0.3 }));  // ES: Regularización / EN: Regularisation
  model.add(
    tf.layers.dense({ units: INTEREST_CATEGORIES.length, activation: "softmax" })
  );

  // ES: Compilar el modelo con Adam y entropía cruzada
  // EN: Compile the model with Adam and cross-entropy
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  // ES: Entrenar durante 30 épocas, lotes de 8, datos mezclados
  // EN: Train for 30 epochs, batch size 8, shuffled data
  await model.fit(xsTensor, ysTensor, {
    epochs: 30,
    batchSize: 8,
    shuffle: true,
    verbose: 0,   // ES: Sin logs por época / EN: No per-epoch logging
  });

  // ES: Liberar tensores de la GPU/CPU para evitar fugas
  // EN: Release tensors from GPU/CPU to avoid memory leaks
  xsTensor.dispose();
  ysTensor.dispose();

  console.log(
    `[GaIA Learning] Modelo entrenado / Model trained with ${trainingData.length} samples`
  );
  return true;
}

// ES: Usa el modelo entrenado para predecir las categorías de un texto.
//     Devuelve null si el modelo no está listo o TF no está disponible.
//     Solo devuelve categorías con probabilidad > 10%.
// EN: Uses the trained model to predict categories for a text.
//     Returns null if the model is not ready or TF is unavailable.
//     Only returns categories with probability > 10%.
function predictWithModel(text) {
  if (!tfAvailable || !model || vocabulary.size === 0) return null;

  let input = null;
  let prediction = null;
  try {
    const vec = textToVector(text);
    input = tf.tensor2d([vec]);
    prediction = model.predict(input);
    const probs = prediction.dataSync();

    const result = {};
    probs.forEach((prob, i) => {
      // ES: Solo categorías con probabilidad relevante (>10%)
      // EN: Only categories with relevant probability (>10%)
      if (prob > 0.1) {
        result[INTEREST_CATEGORIES[i]] = Math.round(prob * 100) / 100;
      }
    });

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    // ES: Si la predicción falla (ej. memoria), loguear y continuar con keywords
    // EN: If prediction fails (e.g. memory), log and continue with keywords
    console.error("[GaIA Learning] Error en predicción TF:", err.message);
    return null;
  } finally {
    // ES: Siempre liberar los tensores aunque haya error
    // EN: Always release tensors even on error
    if (input) input.dispose();
    if (prediction) prediction.dispose();
  }
}

// ── Función principal de aprendizaje / Main learning function ─────
// ES: Llamada por el controlador de IA en cada mensaje del usuario.
//     1. Detecta intereses mediante palabras clave (siempre disponible).
//     2. Acumula el mensaje como dato de entrenamiento para TF.
//     3. Si hay suficientes muestras, lanza entrenamiento en background.
//     4. Combina los scores de keywords + predicción del modelo TF.
//        Los scores del modelo se ponderan x2 por ser más contextuales.
// EN: Called by the AI controller on every user message.
//     1. Detects interests via keywords (always available).
//     2. Accumulates the message as TF training data.
//     3. If enough samples exist, launches background training.
//     4. Merges keyword scores + TF model prediction.
//        Model scores are weighted x2 as they are more contextual.
function learnFromMessage(text) {
  // ES: Paso 1 – detección rápida por palabras clave
  // EN: Step 1 – fast keyword-based detection
  const keywordInterests = detectInterests(text);

  // ES: Paso 2 – acumular datos de entrenamiento para TF
  // EN: Step 2 – accumulate training data for TF
  for (const [category, score] of Object.entries(keywordInterests)) {
    if (score > 0) {
      trainingData.push({ text, category });
    }
  }

  // ES: Paso 3 – entrenar automáticamente cada MIN_TRAINING_SAMPLES mensajes
  //     El entrenamiento es asíncrono para no bloquear la respuesta.
  // EN: Step 3 – auto-train every MIN_TRAINING_SAMPLES messages.
  //     Training is async so it never blocks the response.
  if (
    tfAvailable &&
    trainingData.length > 0 &&
    trainingData.length % MIN_TRAINING_SAMPLES === 0
  ) {
    trainModel().catch((err) =>
      console.error("[GaIA Learning] Error entrenando / Training error:", err.message)
    );
  }

  // ES: Paso 4 – mezclar scores de keywords con predicción del modelo
  // EN: Step 4 – merge keyword scores with model prediction
  const modelInterests = predictWithModel(text);
  if (modelInterests) {
    const merged = { ...keywordInterests };
    for (const [cat, prob] of Object.entries(modelInterests)) {
      // ES: Peso x2 al modelo porque es contextual, no solo léxico
      // EN: x2 weight to model because it is contextual, not just lexical
      merged[cat] = (merged[cat] || 0) + prob * 2;
    }
    return merged;
  }

  return keywordInterests;
}

// ── Prompt personalizado / Personalised system prompt ─────────────
// ES: Construye el prompt de sistema para la IA según el modo
//     (maestro/amigo), la edad del niño y sus intereses detectados.
// EN: Builds the AI system prompt based on mode (teacher/friend),
//     the child's age and their detected interests.
function buildPersonalizedPrompt(mode, age, interests) {
  const ageGroup = getAgeGroup(age);

  let base = `Eres GaIA, asistente IA para ninos (grupo ${ageGroup.label}, ${age} anos). `;
  base += `Usa vocabulario ${ageGroup.vocabulary}. `;
  base += `Tono: ${ageGroup.tone}. `;
  base += `Maximo ${ageGroup.maxResponseSentences} frases por respuesta. `;
  base += `Nivel de censura: ${ageGroup.censorLevel}. `;
  base += `NUNCA hables de: ${ageGroup.blockedTopics.join(", ")}. `;
  base += `Si el usuario pide algo inapropiado, rechaza con calma y propon una alternativa segura o pedir ayuda a un adulto.`;

  if (mode === "friend" && interests && Object.keys(interests).length > 0) {
    const topInterests = Object.entries(interests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    base += `\n\nEres su amiga cercana. Sabes que le interesan: ${topInterests.join(", ")}. `;
    base += `Menciona estos temas naturalmente, propon actividades creativas relacionadas. `;
    base += `Recuerda sus gustos anteriores y hazle sentir escuchado/a. `;
    base += `Fomenta su creatividad y celebra sus ideas.`;
  } else if (mode === "teacher") {
    base += `\n\nEres una maestra paciente. Explica paso a paso con mini-ejemplos adaptados a su edad. `;
    base += `Termina con una pregunta de repaso divertida.`;
  }

  return base;
}

// ── Instancia singleton del caché / Response cache singleton ────────
// ES: Una sola instancia compartida por todo el backend (500 entradas).
// EN: Single instance shared across the whole backend (500 entries).
const responseCache = new ResponseCache(500);

export {
  INTEREST_CATEGORIES,
  AGE_GROUPS,
  getAgeGroup,
  detectInterests,
  detectCreativity,
  learnFromMessage,
  trainModel,
  predictWithModel,
  buildPersonalizedPrompt,
  responseCache,
  normalizeText,
  tokenize,
};
