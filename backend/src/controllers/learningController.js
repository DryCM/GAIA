/* ================================================================
   GaIA Learning Controller / Controlador de Aprendizaje
   ES: Gestiona perfiles de usuario, consentimiento COPPA,
       datos de aprendizaje e intereses para publicidad.
   EN: Manages user profiles, COPPA consent, learning data
       and interest-based advertising.
   ================================================================ */

import {
  getProfile,
  createProfile,
  updateConsent,
  updateAge,
  deleteProfile,
  getAdsProfile,
  hasConsent,
  CONSENT_TYPES,
} from "../services/userProfileService.js";
import { responseCache, INTEREST_CATEGORIES } from "../services/learningService.js";

// ES: Valida y limpia el userId; devuelve null si está vacío.
// EN: Validates and cleans the userId; returns null if empty.
function sanitizeUserId(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  return value.slice(0, 64);
}

// ── POST /api/learning/profile ───────────────────────────────────────────────
// ES: Crea un nuevo perfil de niño con consentimiento parental.
//     La edad debe estar entre 3 y 14 años.
// EN: Creates a new child profile with parental consent.
//     Age must be between 3 and 14 years.
async function createUserProfile(req, res) {
  const { userId, age, consent } = req.body ?? {};
  const id = sanitizeUserId(userId);
  if (!id) {
    return res.status(400).json({ error: "userId requerido" });
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 3 || ageNum > 14) {
    return res.status(400).json({ error: "Edad debe ser entre 3 y 14" });
  }

  const profile = createProfile(id, { age: ageNum, consent: consent || {} });
  return res.json({ profile, consentTypes: CONSENT_TYPES });
}

// ── PUT /api/learning/consent ───────────────────────────────────────────────
// ES: Actualiza los tipos de consentimiento (dataCollection,
//     personalization, adsTargeting) de un perfil existente.
//     Si se revoca dataCollection, se borran los datos recopilados.
// EN: Updates consent types (dataCollection, personalization,
//     adsTargeting) for an existing profile.
//     Revoking dataCollection deletes collected data.
async function updateUserConsent(req, res) {
  const { userId, consent } = req.body ?? {};
  const id = sanitizeUserId(userId);
  if (!id) {
    return res.status(400).json({ error: "userId requerido" });
  }

  const profile = updateConsent(id, consent || {});
  if (!profile) {
    return res.status(404).json({ error: "Perfil no encontrado" });
  }

  return res.json({ profile });
}

// ── PUT /api/learning/age ───────────────────────────────────────────────────────
// ES: Actualiza la edad del niño. El grupo de edad (y por tanto el
//     vocabulario y censura) se recalcula automáticamente.
// EN: Updates the child's age. The age group (and thus vocabulary
//     and censoring level) is recalculated automatically.
async function updateUserAge(req, res) {
  const { userId, age } = req.body ?? {};
  const id = sanitizeUserId(userId);
  if (!id) {
    return res.status(400).json({ error: "userId requerido" });
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 3 || ageNum > 14) {
    return res.status(400).json({ error: "Edad debe ser entre 3 y 14" });
  }

  const profile = updateAge(id, ageNum);
  if (!profile) {
    return res.status(404).json({ error: "Perfil no encontrado" });
  }

  return res.json({ profile });
}

// ── GET /api/learning/profile/:userId ─────────────────────────────────────────
// ES: Devuelve el perfil completo de un usuario.
// EN: Returns the full profile of a user.
async function getUserProfile(req, res) {
  const id = sanitizeUserId(req.params.userId);
  if (!id) {
    return res.status(400).json({ error: "userId requerido" });
  }

  const profile = getProfile(id);
  if (!profile) {
    return res.status(404).json({ error: "Perfil no encontrado" });
  }

  return res.json({ profile });
}

// ── DELETE /api/learning/profile/:userId ───────────────────────────────────────
// ES: Elimina TODOS los datos del usuario (cumplimiento COPPA/GDPR).
//     No hay vuelta atrás. La app debe pedir confirmación parental.
// EN: Deletes ALL user data (COPPA/GDPR compliance).
//     This is irreversible. The app should request parental confirmation.
async function deleteUserProfile(req, res) {
  const id = sanitizeUserId(req.params.userId);
  if (!id) {
    return res.status(400).json({ error: "userId requerido" });
  }

  const deleted = deleteProfile(id);
  if (!deleted) {
    return res.status(404).json({ error: "Perfil no encontrado" });
  }

  return res.json({
    deleted: true,
    message: "Todos los datos del usuario han sido eliminados",
  });
}

// ── GET /api/learning/interests/:userId ─────────────────────────────────────
// ES: Devuelve el perfil de intereses para publicidad.
//     Requiere que el padre haya dado consentimiento 'adsTargeting'.
//     Devuelve 403 si no hay consentimiento.
// EN: Returns the interest profile for advertising.
//     Requires the parent to have granted 'adsTargeting' consent.
//     Returns 403 if consent is absent.
async function getUserInterests(req, res) {
  const id = sanitizeUserId(req.params.userId);
  if (!id) {
    return res.status(400).json({ error: "userId requerido" });
  }

  if (!hasConsent(id, "adsTargeting")) {
    return res.status(403).json({
      error: "El usuario no ha dado consentimiento para publicidad",
    });
  }

  const adsProfile = getAdsProfile(id);
  if (!adsProfile) {
    return res.status(404).json({ error: "Sin datos disponibles" });
  }

  return res.json({ adsProfile });
}

// ── GET /api/learning/stats ───────────────────────────────────────────────────
// ES: Devuelve estadísticas del sistema de aprendizaje:
//     tamaño de la caché, lista de categorías y tipos de consentimiento.
// EN: Returns learning system statistics:
//     cache size, list of categories and consent types.
async function getLearningStats(req, res) {
  return res.json({
    cacheSize: responseCache.size,
    categories: INTEREST_CATEGORIES,
    consentTypes: CONSENT_TYPES,
  });
}

export {
  createUserProfile,
  updateUserConsent,
  updateUserAge,
  getUserProfile,
  deleteUserProfile,
  getUserInterests,
  getLearningStats,
};
