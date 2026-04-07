import path from "node:path";
import { fileURLToPath } from "node:url";

function parsePositiveInteger(value, fallback) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return Math.floor(parsed);
}

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

const port = parsePositiveInteger(process.env.PORT, 4000);
const dailyFreeCredits = parsePositiveInteger(process.env.DAILY_FREE_CREDITS, 25);
const creditsStoreFilePath = parseNonEmptyString(
	process.env.CREDITS_STORE_FILE,
	path.join(backendRootDir, "data", "credits-store.json")
);

export { port, dailyFreeCredits, creditsStoreFilePath };