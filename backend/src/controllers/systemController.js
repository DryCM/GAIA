function healthCheck(req, res) {
  return res.json({
    ok: true,
    service: "gaia-backend",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

export { healthCheck };