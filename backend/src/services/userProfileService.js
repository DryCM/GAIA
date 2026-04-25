/* ================================================================
   GaIA User Profile Service / Servicio de Perfiles de Usuario
   ES: Gestión de perfiles, consentimiento (COPPA/GDPR), intereses
       y datos para personalización y publicidad (solo con consentimiento).
       Todos los datos se guardan en data/user-profiles.json.
   EN: Profile management, COPPA/GDPR consent, interests and data
       for personalisation and advertising (only with consent).
       All data is saved to data/user-profiles.json.
   ================================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data"
);
const profilesFile = path.join(dataDir, "user-profiles.json");

// ── Tipos de consentimiento ────────────────────────────────────
const CONSENT_TYPES = {
  dataCollection: "Recopilar datos de uso para mejorar la experiencia",
  personalization: "Personalizar respuestas segun intereses del nino",
  adsTargeting: "Usar intereses para mostrar publicidad acorde a su edad",
};

// ── Persistencia ───────────────────────────────────────────────
function loadProfiles() {
  try {
    if (fs.existsSync(profilesFile)) {
      return JSON.parse(fs.readFileSync(profilesFile, "utf8"));
    }
  } catch {
    /* archivo corrupto → empezar limpio */
  }
  return {};
}

function saveProfiles(profiles) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2), "utf8");
}

// ── CRUD de perfiles ───────────────────────────────────────────

// ES: Devuelve null si no existe el perfil.
// EN: Returns null if the profile does not exist.
function getProfile(userId) {
  const profiles = loadProfiles();
  return profiles[userId] || null;
}

// ES: Si el perfil ya existe, lo devuelve sin modificar (idempotente).
// EN: If the profile already exists, returns it unchanged (idempotent).
function createProfile(userId, { age, consent = {} }) {
  const profiles = loadProfiles();

  if (profiles[userId]) {
    return profiles[userId]; // ES: ya existe / EN: already exists
  }

  profiles[userId] = {
    userId,
    age: parseInt(age, 10) || 8,
    consent: {
      dataCollection: !!consent.dataCollection,
      personalization: !!consent.personalization,
      adsTargeting: !!consent.adsTargeting,
      consentedBy: consent.consentedBy || "parent",
      consentDate: new Date().toISOString(),
    },
    interests: {},
    favoriteTopics: [],
    creativityScore: 0,
    totalMessages: 0,
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  saveProfiles(profiles);
  return profiles[userId];
}

function updateConsent(userId, consent) {
  const profiles = loadProfiles();
  if (!profiles[userId]) return null;

  profiles[userId].consent = {
    ...profiles[userId].consent,
    ...consent,
    consentDate: new Date().toISOString(),
  };

  // Si se revoca recopilación de datos, borrar datos recopilados
  if (consent.dataCollection === false) {
    profiles[userId].interests = {};
    profiles[userId].favoriteTopics = [];
    profiles[userId].creativityScore = 0;
  }

  saveProfiles(profiles);
  return profiles[userId];
}

function updateAge(userId, age) {
  const profiles = loadProfiles();
  if (!profiles[userId]) return null;

  profiles[userId].age = parseInt(age, 10) || profiles[userId].age;
  saveProfiles(profiles);
  return profiles[userId];
}

// ES: Acumula puntuaciones de interés en el perfil del usuario.
//     Solo actualiza si se dio consentimiento de recopilación.
//     Mantiene los 5 temas favoritos ordenados por puntuación.
// EN: Accumulates interest scores in the user profile.
//     Only updates if data-collection consent was given.
//     Keeps the top 5 favourite topics ordered by score.
function recordInteraction(userId, interests) {
  const profiles = loadProfiles();
  const profile = profiles[userId];
  if (!profile) return null;
  if (!profile.consent.dataCollection) return profile; // ES: sin consentimiento / EN: no consent

  // ES: Acumular puntuaciones de interés
  // EN: Accumulate interest scores
  for (const [category, score] of Object.entries(interests)) {
    profile.interests[category] =
      (profile.interests[category] || 0) + score;
  }

  // ES: Mantener top 5 temas favoritos
  // EN: Keep top 5 favourite topics
  profile.favoriteTopics = Object.entries(profile.interests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  profile.totalMessages = (profile.totalMessages || 0) + 1;
  profile.lastActive = new Date().toISOString();

  saveProfiles(profiles);
  return profile;
}

// ES: Actualiza el score de creatividad del usuario como
//     media móvil ponderada por el total de mensajes.
// EN: Updates the user's creativity score as a
//     weighted moving average by total messages.
function recordCreativity(userId, score) {
  const profiles = loadProfiles();
  const profile = profiles[userId];
  if (!profile || !profile.consent.dataCollection) return null;

  // ES: Media móvil de creatividad
  // EN: Creativity moving average
  const prev = profile.creativityScore || 0;
  const count = profile.totalMessages || 1;
  profile.creativityScore =
    Math.round(((prev * (count - 1) + score) / count) * 100) / 100;

  saveProfiles(profiles);
  return profile;
}

function deleteProfile(userId) {
  const profiles = loadProfiles();
  if (!profiles[userId]) return false;

  delete profiles[userId];
  saveProfiles(profiles);
  return true;
}

function hasConsent(userId, type) {
  const profile = getProfile(userId);
  if (!profile) return false;
  return !!profile.consent[type];
}

// ── Perfil anonimizado para publicidad / Anonymised ads profile ───
// ES: Devuelve solo grupo de edad, intereses top y nivel de creatividad.
//     NUNCA devuelve el userId ni datos identificativos.
// EN: Returns only age group, top interests and creativity level.
//     NEVER returns the userId or identifying data.
function getAdsProfile(userId) {
  const profile = getProfile(userId);
  if (!profile || !profile.consent.adsTargeting) return null;

  const n = parseInt(profile.age, 10);
  const ageGroup = isNaN(n) || n <= 5 ? "3-5" : n <= 8 ? "6-8" : "9-12";

  return {
    ageGroup,
    topInterests: profile.favoriteTopics.slice(0, 3),
    creativityLevel:
      profile.creativityScore > 0.6
        ? "alto"
        : profile.creativityScore > 0.3
          ? "medio"
          : "bajo",
  };
}

export {
  CONSENT_TYPES,
  getProfile,
  createProfile,
  updateConsent,
  updateAge,
  recordInteraction,
  recordCreativity,
  deleteProfile,
  hasConsent,
  getAdsProfile,
};
