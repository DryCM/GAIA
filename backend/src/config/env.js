function parsePositiveInteger(value, fallback) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}

	return Math.floor(parsed);
}

const port = parsePositiveInteger(process.env.PORT, 4000);
const dailyFreeCredits = parsePositiveInteger(process.env.DAILY_FREE_CREDITS, 25);

export { port, dailyFreeCredits };