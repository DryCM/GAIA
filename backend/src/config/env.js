/* ================================================================
   GaIA Environment Configuration / Configuración de Entorno
   ES: Centraliza la lectura de variables de entorno con valores
       por defecto seguros. Todas las variables se leen del .env
       cargado por dotenv en el punto de entrada (server.js).
   EN: Centralises reading of environment variables with safe
       defaults. All variables are read from .env loaded by
       dotenv in the entry point (server.js).
   ================================================================ */

import path from "node:path";
import { fileURLToPath } from "node:url";

// ES: Asegura que el valor sea un número entero positivo.
//     Si no es válido, devuelve `fallback`.
// EN: Ensures the value is a positive integer.
//     Returns `fallback` if invalid.
function parsePositiveInteger(value, fallback) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return Math.floor(parsed);
}

// ES: Asegura que el valor sea un string no vacío.
//     Si no lo es, devuelve `fallback`.
// EN: Ensures the value is a non-empty string.
//     Returns `fallback` if not.
function parseNonEmptyString(value, fallback) {
	if (typeof value !== "string") {
		return fallback;
	}

	const parsed = value.trim();
	if (!parsed) {
		return fallback;
	}

	return parsed;
}

const configDir = path.dirname(fileURLToPath(import.meta.url));
const backendRootDir = path.resolve(configDir, "../..");

// ES: Puerto HTTP del servidor (por defecto 4000)
// EN: HTTP server port (default 4000)
const port = parsePositiveInteger(process.env.PORT, 4000);

// ES: Créditos gratuitos diarios por usuario (por defecto 25)
// EN: Daily free credits per user (default 25)
const dailyFreeCredits = parsePositiveInteger(process.env.DAILY_FREE_CREDITS, 25);

// ES: Ruta del archivo JSON donde se persisten los créditos.
//     Se puede sobrescribir con CREDITS_STORE_FILE en .env.
// EN: Path to the JSON file where credits are persisted.
//     Can be overridden with CREDITS_STORE_FILE in .env.
const creditsStoreFilePath = parseNonEmptyString(
	process.env.CREDITS_STORE_FILE,
	path.join(backendRootDir, "data", "credits-store.json")
);

export { port, dailyFreeCredits, creditsStoreFilePath };