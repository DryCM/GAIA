import crypto from "crypto";

function requestContext(req, res, next) {
  const requestId = crypto.randomUUID();
  const startAt = Date.now();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const elapsedMs = Date.now() - startAt;
    console.log(`[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms`);
  });

  next();
}

export { requestContext };