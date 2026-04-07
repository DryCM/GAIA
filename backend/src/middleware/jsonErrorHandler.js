function jsonErrorHandler(error, req, res, next) {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      error: "JSON invalido",
      requestId: req.requestId,
    });
  }

  return next(error);
}

export { jsonErrorHandler };