/* ================================================================
   GaIA Knowledge Base
   Cultura general, educación por asignaturas, curiosidades y
   datos divertidos para niños de 3 a 18 años.
   Primaria → ESO → Bachillerato
   ================================================================ */

import { PRIMARIA, ESO, BACHILLERATO, EDUCATION_FUN_FACTS } from './educationKnowledge.js';

// ── Cultura general ────────────────────────────────────────────
const GENERAL_KNOWLEDGE = [
  // Animales
  { topic: "animales", q: "cuanto vive una tortuga", a: "Las tortugas gigantes pueden vivir mas de 150 anos. La tortuga mas vieja conocida, Jonathan, tiene mas de 190 anos y vive en la isla de Santa Elena." },
  { topic: "animales", q: "animal mas rapido del mundo", a: "El guepardo es el animal terrestre mas rapido, puede correr a 120 km/h. En el aire, el halcon peregrino alcanza 390 km/h en picada." },
  { topic: "animales", q: "cuantas patas tiene una araña", a: "Las aranas tienen 8 patas. No son insectos, son aracnidos. Los insectos tienen 6 patas." },
  { topic: "animales", q: "como respiran los peces", a: "Los peces respiran con branquias. El agua entra por la boca y pasa por las branquias, que extraen el oxigeno disuelto en el agua." },
  { topic: "animales", q: "por que las cebras tienen rayas", a: "Los cientificos creen que las rayas de las cebras ayudan a confundir a los insectos que pican y tambien dificultan que los depredadores distingan a una cebra individual en el grupo." },
  { topic: "animales", q: "el delfin es un pez", a: "No, los delfines son mamiferos. Respiran aire, son de sangre caliente y alimentan a sus crias con leche." },
  { topic: "animales", q: "cuantos huesos tiene un tiburon", a: "Los tiburones no tienen huesos. Su esqueleto esta hecho de cartilago, el mismo material flexible que forma tu nariz y orejas." },
  { topic: "animales", q: "como duermen los delfines", a: "Los delfines duermen con un ojo abierto. Solo descansan la mitad de su cerebro a la vez, asi siguen nadando y respirando." },
  { topic: "animales", q: "por que los gatos ronronean", a: "Los gatos ronronean vibrando los musculos de su laringe. Lo hacen cuando estan contentos, pero tambien para calmarse cuando estan nerviosos o heridos." },
  { topic: "animales", q: "por que los perros mueven la cola", a: "Los perros mueven la cola para comunicarse. Si la mueven a la derecha suelen estar contentos. A la izquierda puede indicar nerviosismo." },

  // Planetas y espacio
  { topic: "espacio", q: "cuantos planetas hay en el sistema solar", a: "Hay 8 planetas en el sistema solar: Mercurio, Venus, Tierra, Marte, Jupiter, Saturno, Urano y Neptuno. Pluton fue reclasificado como planeta enano en 2006." },
  { topic: "espacio", q: "por que la luna brilla", a: "La Luna no tiene luz propia. Brilla porque refleja la luz del Sol, como un espejo gigante en el cielo." },
  { topic: "espacio", q: "que es una estrella fugaz", a: "Las estrellas fugaces no son estrellas. Son meteoritos, pequenos trozos de roca espacial que se queman al entrar en la atmosfera de la Tierra a gran velocidad, creando una linea de luz." },
  { topic: "espacio", q: "cual es el planeta mas grande", a: "Jupiter es el planeta mas grande del sistema solar. Es tan grande que dentro cabrian mas de 1.300 Tierras." },
  { topic: "espacio", q: "por que hay dia y noche", a: "La Tierra gira sobre si misma como una peonza. Cuando tu lado mira al Sol es de dia, y cuando mira al otro lado es de noche. Una vuelta completa tarda 24 horas." },
  { topic: "espacio", q: "que es la via lactea", a: "La Via Lactea es nuestra galaxia, una enorme espiral de estrellas, planetas y polvo cosmico. Contiene entre 100.000 y 400.000 millones de estrellas, y nuestro Sol es solo una de ellas." },
  { topic: "espacio", q: "cuanto se tarda en llegar a la luna", a: "Con un cohete moderno se tarda unos 3 dias. Los astronautas del Apollo 11 tardaron 3 dias, 3 horas y 49 minutos en llegar." },
  { topic: "espacio", q: "por que marte es rojo", a: "Marte es rojo porque su superficie tiene mucho oxido de hierro, que es basicamente herrumbre. Es como si todo el planeta estuviera un poco oxidado." },

  // Naturaleza
  { topic: "naturaleza", q: "por que el cielo es azul", a: "La luz del Sol tiene todos los colores del arcoiris. Cuando entra en la atmosfera, las moleculas del aire dispersan mas la luz azul que los otros colores, por eso vemos el cielo azul." },
  { topic: "naturaleza", q: "como se forman los arcoiris", a: "Los arcoiris se forman cuando la luz del sol pasa a traves de gotas de lluvia. Cada gota actua como un prisma que separa la luz blanca en sus 7 colores: rojo, naranja, amarillo, verde, azul, anil y violeta." },
  { topic: "naturaleza", q: "por que llueve", a: "El Sol calienta el agua de rios, mares y lagos, que se evapora y sube al cielo. Arriba hace frio y el vapor se convierte en gotitas que forman nubes. Cuando las gotas son muy pesadas, caen como lluvia." },
  { topic: "naturaleza", q: "como se forman los volcanes", a: "Debajo de la superficie de la Tierra hay roca derretida llamada magma. Cuando la presion es muy grande, el magma sube y sale por una abertura formando un volcan. La roca derretida que sale se llama lava." },
  { topic: "naturaleza", q: "por que las hojas cambian de color en otono", a: "En otono hay menos luz solar. Los arboles dejan de producir clorofila (el pigmento verde) y se ven otros colores que estaban ocultos: amarillo, naranja y rojo." },
  { topic: "naturaleza", q: "por que hay terremotos", a: "La superficie de la Tierra esta formada por enormes placas que se mueven muy lentamente. Cuando estas placas chocan, se separan o se rozan, la tierra tiembla y sentimos un terremoto." },
  { topic: "naturaleza", q: "que es un fosil", a: "Un fosil es el resto o la huella de un ser vivo que existio hace miles o millones de anos. Se forman cuando los restos quedan enterrados y con el tiempo se convierten en piedra." },

  // Cuerpo humano
  { topic: "cuerpo", q: "cuantos huesos tiene el cuerpo humano", a: "Un adulto tiene 206 huesos. Los bebes nacen con unos 270 huesos blandos que se van fusionando a medida que crecen." },
  { topic: "cuerpo", q: "por que tenemos hipo", a: "El hipo ocurre cuando el diafragma, un musculo debajo de los pulmones, se contrae de repente sin control. El sonido 'hip' lo produce el aire chocando contra las cuerdas vocales cerradas." },
  { topic: "cuerpo", q: "por que bostezamos", a: "Los cientificos creen que bostezar ayuda a enfriar el cerebro y a mantenernos alerta. Tambien es contagioso: si ves a alguien bostezar, tu cerebro puede copiar la accion." },
  { topic: "cuerpo", q: "por que nos salen moratones", a: "Cuando te das un golpe, los pequenos vasos sanguineos debajo de la piel se rompen y la sangre se acumula ahi. Por eso se ve azul o morado. Tu cuerpo lo va limpiando y el color cambia hasta desaparecer." },
  { topic: "cuerpo", q: "cuantos litros de sangre tenemos", a: "Un nino de unos 8 anos tiene alrededor de 2.5 litros de sangre. Un adulto tiene entre 4.5 y 5.5 litros. El corazon la bombea por todo el cuerpo sin parar." },
  { topic: "cuerpo", q: "por que sudamos", a: "Sudamos para enfriar el cuerpo. Cuando hace calor o haces ejercicio, las glandulas sudoriparas liberan agua en la piel. Al evaporarse, esa agua te refresca." },
  { topic: "cuerpo", q: "para que sirven las cejas", a: "Las cejas evitan que el sudor y la lluvia caigan directamente en los ojos. Tambien nos ayudan a expresar emociones: sorpresa, enfado, alegria." },

  // Historia
  { topic: "historia", q: "quien invento la bombilla", a: "Thomas Edison perfecciono la bombilla electrica en 1879 con un filamento de carbon que duraba muchas horas. Antes, otros inventores como Humphry Davy habian hecho versiones mas basicas." },
  { topic: "historia", q: "que eran los dinosaurios", a: "Los dinosaurios fueron reptiles que vivieron en la Tierra hace millones de anos. Dominaron el planeta durante 165 millones de anos hasta que un asteroide gigante impacto hace 66 millones de anos." },
  { topic: "historia", q: "quien construyo las piramides", a: "Las piramides de Egipto fueron construidas por miles de trabajadores egipcios hace unos 4.500 anos. La Gran Piramide de Guiza tardo unos 20 anos en construirse." },
  { topic: "historia", q: "por que se extinguieron los dinosaurios", a: "Hace 66 millones de anos, un asteroide enorme cayo en lo que hoy es Mexico. Levanto tanto polvo que bloqueo la luz del sol, las plantas murieron y con ellas los dinosaurios." },
  { topic: "historia", q: "cuando se invento el avion", a: "Los hermanos Wright hicieron el primer vuelo con motor el 17 de diciembre de 1903. El vuelo duro solo 12 segundos y recorrio 37 metros." },
];

// ── Educativo por asignaturas ──────────────────────────────────
const SCHOOL_KNOWLEDGE = [
  // Matematicas
  { subject: "mates", q: "que es una fraccion", a: "Una fraccion representa una parte de un todo. Si tienes una pizza cortada en 4 trozos y te comes 1, has comido 1/4 (un cuarto) de la pizza." },
  { subject: "mates", q: "que es un numero primo", a: "Un numero primo solo se puede dividir entre 1 y el mismo. Los primeros numeros primos son: 2, 3, 5, 7, 11, 13, 17, 19, 23. El 2 es el unico numero primo par." },
  { subject: "mates", q: "que es el perimetro", a: "El perimetro es la suma de todos los lados de una figura. Si tienes un cuadrado con lados de 5 cm, su perimetro es 5+5+5+5 = 20 cm." },
  { subject: "mates", q: "que es el area", a: "El area es el espacio que ocupa una figura por dentro. Para un rectangulo, multiplicas base por altura. Un rectangulo de 4 cm x 3 cm tiene un area de 12 centimetros cuadrados." },
  { subject: "mates", q: "tablas de multiplicar truco", a: "Truco para la tabla del 9: pon las manos abiertas, baja el dedo que quieres multiplicar por 9. Los dedos a la izquierda son las decenas y los de la derecha las unidades. Ejemplo: 9x3 baja el tercer dedo y quedan 2 y 7, o sea 27." },
  { subject: "mates", q: "que es la simetria", a: "La simetria es cuando puedes dividir algo en dos partes iguales que son como un espejo. Una mariposa es simetrica: su ala izquierda es igual que la derecha." },
  { subject: "mates", q: "que es un angulo recto", a: "Un angulo recto mide exactamente 90 grados. Es la esquina de un cuadrado o de una hoja de papel. Cuando ves una L, eso forma un angulo recto." },

  // Lengua
  { subject: "lengua", q: "que es un sustantivo", a: "Un sustantivo es una palabra que nombra cosas, personas, animales o lugares. Ejemplos: perro, mesa, Maria, ciudad, alegria." },
  { subject: "lengua", q: "que es un verbo", a: "Un verbo es una palabra que indica una accion o un estado. Ejemplos: correr, saltar, comer, ser, estar. Es el motor de las oraciones." },
  { subject: "lengua", q: "que es un adjetivo", a: "Un adjetivo describe como es un sustantivo. Ejemplo: 'El gato GRANDE y NEGRO durmio en la cama COMODA'. Grande, negro y comoda son adjetivos." },
  { subject: "lengua", q: "diferencia entre hay ahi y ay", a: "Hay (del verbo haber): 'Hay tres gatos'. Ahi (lugar): 'Dejalo ahi'. Ay (exclamacion): 'Ay, me duele!'. Truco: HAY = HAber, AHI = lugar AHI, AY = dolor AY." },
  { subject: "lengua", q: "que es una onomatopeya", a: "Una onomatopeya es una palabra que imita un sonido real. Ejemplos: guau (perro), miau (gato), tic-tac (reloj), plop (gota), boom (explosion)." },
  { subject: "lengua", q: "que es un sinonimo y antonimo", a: "Los sinonimos son palabras que significan lo mismo: bonito y hermoso, rapido y veloz. Los antonimos son palabras con significado opuesto: grande y pequeno, frio y caliente." },
  { subject: "lengua", q: "que es una metafora", a: "Una metafora dice que algo ES otra cosa para describirlo mejor. Ejemplo: 'Tus ojos son estrellas' no significa que tus ojos sean estrellas de verdad, sino que brillan mucho." },

  // Ingles
  { subject: "ingles", q: "colores en ingles", a: "Red (rojo), blue (azul), green (verde), yellow (amarillo), orange (naranja), purple (morado), pink (rosa), black (negro), white (blanco), brown (marron)." },
  { subject: "ingles", q: "numeros en ingles", a: "One (1), two (2), three (3), four (4), five (5), six (6), seven (7), eight (8), nine (9), ten (10). Truco: THREE tiene tres Es." },
  { subject: "ingles", q: "animales en ingles", a: "Dog (perro), cat (gato), bird (pajaro), fish (pez), horse (caballo), rabbit (conejo), bear (oso), elephant (elefante), monkey (mono), butterfly (mariposa)." },
  { subject: "ingles", q: "dias de la semana en ingles", a: "Monday (lunes), Tuesday (martes), Wednesday (miercoles), Thursday (jueves), Friday (viernes), Saturday (sabado), Sunday (domingo)." },
  { subject: "ingles", q: "como me presento en ingles", a: "Hello! My name is [tu nombre]. I am [edad] years old. I like [algo que te guste]. Nice to meet you!" },
  { subject: "ingles", q: "meses del año en ingles", a: "January, February, March, April, May, June, July, August, September, October, November, December." },

  // Ciencias naturales
  { subject: "ciencias", q: "que son las celulas", a: "Las celulas son las piezas mas pequenas de los seres vivos, como los ladrillos de una casa. Tu cuerpo tiene billones de celulas. Son tan pequenas que solo se ven con microscopio." },
  { subject: "ciencias", q: "que es la fotosintesis", a: "La fotosintesis es como las plantas 'cocinan' su comida. Usan la luz del sol, el agua y el CO2 del aire para crear su alimento y liberar oxigeno, el aire que nosotros respiramos." },
  { subject: "ciencias", q: "estados de la materia", a: "La materia tiene 3 estados principales: solido (como el hielo, tiene forma fija), liquido (como el agua, toma la forma del recipiente) y gaseoso (como el vapor, se expande por todos lados)." },
  { subject: "ciencias", q: "que es la gravedad", a: "La gravedad es la fuerza que atrae todo hacia el centro de la Tierra. Por eso cuando saltas vuelves a bajar, y por eso la Luna gira alrededor de la Tierra. Fue descubierta por Isaac Newton." },
  { subject: "ciencias", q: "por que flotan los barcos", a: "Los barcos flotan por el principio de Arquimedes: un objeto flota si pesa menos que el agua que desplaza. Los barcos tienen mucho aire dentro, lo que los hace mas ligeros que el agua que apartan." },
  { subject: "ciencias", q: "que es el ADN", a: "El ADN es como un libro de instrucciones dentro de cada celula que dice como eres: el color de tus ojos, tu altura, tu pelo. Lo heredas de tus padres, por eso te pareces a ellos." },
  { subject: "ciencias", q: "como funcionan los imanes", a: "Los imanes tienen dos polos: norte y sur. Los polos opuestos se atraen (norte con sur) y los iguales se repelen (norte con norte). Esto pasa por el campo magnetico que crean." },
];

// ── Curiosidades y datos divertidos ────────────────────────────
const FUN_FACTS = [
  { topic: "animales", fact: "Las vacas tienen mejores amigas y se estresan si las separan." },
  { topic: "animales", fact: "Los pulpos tienen 3 corazones y sangre azul." },
  { topic: "animales", fact: "Las nutrias duermen tomadas de la mano para no separarse en el agua." },
  { topic: "animales", fact: "Los flamencos son rosas por la comida que comen (camarones). Si no los comen, se vuelven blancos." },
  { topic: "animales", fact: "Un grupo de buhos se llama 'parlamento'." },
  { topic: "animales", fact: "Los colibries son las unicas aves que pueden volar hacia atras." },
  { topic: "animales", fact: "Las huellas de la nariz de un perro son unicas, como las huellas dactilares humanas." },
  { topic: "animales", fact: "Los caballos pueden dormir de pie gracias a un sistema especial en sus patas." },
  { topic: "animales", fact: "Las hormigas pueden cargar 50 veces su propio peso. Es como si tu cargaras un coche." },
  { topic: "animales", fact: "Los gatos pasan el 70% de su vida durmiendo." },
  { topic: "espacio", fact: "Un dia en Venus dura mas que un ano en Venus. Gira tan lento que su dia dura 243 dias terrestres, pero su ano solo 225." },
  { topic: "espacio", fact: "En el espacio, los astronautas crecen hasta 5 cm porque la gravedad no comprime su columna." },
  { topic: "espacio", fact: "El Sol es tan grande que cabrian 1.3 millones de Tierras dentro." },
  { topic: "espacio", fact: "Hay mas estrellas en el universo que granos de arena en todas las playas de la Tierra." },
  { topic: "espacio", fact: "La huella que dejo Neil Armstrong en la Luna sigue ahi porque no hay viento que la borre." },
  { topic: "espacio", fact: "Saturno es tan ligero que si hubiera una banera lo suficientemente grande, flotaria en el agua." },
  { topic: "espacio", fact: "La luz del Sol tarda 8 minutos y 20 segundos en llegar a la Tierra." },
  { topic: "cuerpo", fact: "Tu cerebro usa el 20% de toda la energia de tu cuerpo aunque solo pesa 1.4 kilos." },
  { topic: "cuerpo", fact: "Los bebes tienen mas huesos que los adultos: unos 270 frente a 206." },
  { topic: "cuerpo", fact: "Tu corazon late unas 100.000 veces al dia. Eso es mas de 36 millones de veces al ano." },
  { topic: "cuerpo", fact: "Si pusieras todos tus vasos sanguineos en linea, darian la vuelta a la Tierra mas de dos veces." },
  { topic: "cuerpo", fact: "El estomago produce un acido tan fuerte que puede disolver metal. Se renueva cada 3-4 dias para no digerirse a si mismo." },
  { topic: "cuerpo", fact: "Tus ojos pueden distinguir aproximadamente 10 millones de colores diferentes." },
  { topic: "naturaleza", fact: "La miel nunca se pone mala. Se ha encontrado miel de 3.000 anos en tumbas egipcias que aun se podia comer." },
  { topic: "naturaleza", fact: "Un rayo puede calentar el aire a 30.000 grados, 5 veces mas caliente que la superficie del Sol." },
  { topic: "naturaleza", fact: "El oceano mas profundo (Fosa de las Marianas) tiene 11.000 metros. Si pusieras el Everest ahi, aun sobrarian 2 km de agua por encima." },
  { topic: "naturaleza", fact: "Los arboles se comunican entre si a traves de sus raices y hongos subterraneos, compartiendo nutrientes. Los cientificos lo llaman 'la internet del bosque'." },
  { topic: "naturaleza", fact: "Hay mas bacterias en tu cuerpo que estrellas en la Via Lactea." },
  { topic: "tecnologia", fact: "El primer ordenador pesaba 27 toneladas y ocupaba una habitacion entera." },
  { topic: "tecnologia", fact: "Tu telefono movil tiene mas potencia de calculo que los ordenadores que llevaron al hombre a la Luna." },
  { topic: "tecnologia", fact: "La primera pagina web se creo en 1991 y aun se puede visitar." },
  { topic: "tecnologia", fact: "Cada minuto se suben mas de 500 horas de video a YouTube." },
  { topic: "historia", fact: "Cleopatra vivio mas cerca en el tiempo de la llegada a la Luna que de la construccion de las piramides." },
  { topic: "historia", fact: "Los antiguos romanos usaban orina como enjuague bucal porque contiene amoniaco que blanquea los dientes." },
  { topic: "historia", fact: "Antes de los despertadores, existia el trabajo de 'despertador humano': alguien que iba por las casas golpeando ventanas con un palo." },
];

// ── Fusionar con base educativa expandida ──────────────────────
const ALL_SCHOOL = [...SCHOOL_KNOWLEDGE, ...PRIMARIA, ...ESO, ...BACHILLERATO];
const ALL_FACTS  = [...FUN_FACTS, ...EDUCATION_FUN_FACTS];

// ── Motor de búsqueda de conocimientos ─────────────────────────

function normalizeForSearch(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearch(text) {
  return normalizeForSearch(text).split(" ").filter((w) => w.length > 2);
}

function scoreSimilarity(queryTokens, targetText) {
  const targetNorm = normalizeForSearch(targetText);
  let score = 0;

  for (const token of queryTokens) {
    if (targetNorm.includes(token)) {
      score += 1;
    }
  }

  // Bonus for consecutive word matches (phrase match)
  const queryPhrase = queryTokens.join(" ");
  if (targetNorm.includes(queryPhrase)) {
    score += queryTokens.length;
  }

  return score;
}

/**
 * Busca conocimientos relevantes para una pregunta del usuario.
 * Devuelve un string con los conocimientos encontrados, listo para
 * inyectar en el system prompt de la IA.
 */
function findKnowledge(userText, maxResults = 3) {
  const tokens = tokenizeSearch(userText);
  if (tokens.length === 0) return "";

  const results = [];

  // Buscar en cultura general
  for (const entry of GENERAL_KNOWLEDGE) {
    const score = scoreSimilarity(tokens, entry.q) +
      scoreSimilarity(tokens, entry.topic) * 0.5;
    if (score > 0) {
      results.push({ type: "conocimiento", text: entry.a, score });
    }
  }

  // Buscar en educación (original + primaria + ESO + bachillerato)
  for (const entry of ALL_SCHOOL) {
    const score = scoreSimilarity(tokens, entry.q) +
      scoreSimilarity(tokens, entry.subject) * 0.5 +
      (entry.level ? scoreSimilarity(tokens, entry.level) * 0.3 : 0);
    if (score > 0) {
      const label = entry.level ? `educacion/${entry.level}` : "educacion";
      results.push({ type: label, text: entry.a, score });
    }
  }

  // Buscar en curiosidades (original + educativas)
  for (const entry of ALL_FACTS) {
    const score = scoreSimilarity(tokens, entry.fact) +
      scoreSimilarity(tokens, entry.topic) * 0.5;
    if (score > 0) {
      results.push({ type: "curiosidad", text: entry.fact, score });
    }
  }

  // Ordenar por relevancia y tomar los mejores
  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, maxResults);

  if (top.length === 0) return "";

  let context = "\n\n[Conocimientos de GaIA que puedes usar en tu respuesta]:\n";
  for (const r of top) {
    context += `- (${r.type}) ${r.text}\n`;
  }
  context += "\nUsa estos datos para dar una respuesta precisa y educativa. Si la pregunta no coincide exactamente, adapta la informacion.";

  return context;
}

/**
 * Devuelve una curiosidad aleatoria, opcionalmente filtrada por tema.
 */
function getRandomFact(topic = null) {
  const pool = topic
    ? ALL_FACTS.filter((f) => f.topic === topic)
    : ALL_FACTS;

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Estadísticas de la base de conocimientos.
 */
function getKnowledgeStats() {
  return {
    generalKnowledge: GENERAL_KNOWLEDGE.length,
    schoolKnowledge: ALL_SCHOOL.length,
    funFacts: ALL_FACTS.length,
    total: GENERAL_KNOWLEDGE.length + ALL_SCHOOL.length + ALL_FACTS.length,
    byLevel: {
      original: SCHOOL_KNOWLEDGE.length,
      primaria: PRIMARIA.length,
      eso: ESO.length,
      bachillerato: BACHILLERATO.length,
    },
    topics: [...new Set([
      ...GENERAL_KNOWLEDGE.map((e) => e.topic),
      ...ALL_FACTS.map((e) => e.topic),
    ])],
    subjects: [...new Set(ALL_SCHOOL.map((e) => e.subject))],
  };
}

export {
  findKnowledge,
  getRandomFact,
  getKnowledgeStats,
  GENERAL_KNOWLEDGE,
  SCHOOL_KNOWLEDGE,
  FUN_FACTS,
};
