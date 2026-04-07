function notFoundHandler(req, res) {
  return res.status(404).json({
    error: "Ruta no encontrada",
    requestId: req.requestId,
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.statusCode || 500).json({
    error: "Error interno del servidor",
    details: error instanceof Error ? error.message : "Error desconocido",
    requestId: req.requestId,
  });
}

export { notFoundHandler, errorHandler };