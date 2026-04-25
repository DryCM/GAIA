/* ================================================================
   GaIA Backend Entry Point / Punto de Entrada del Backend
   ES: Arranca el servidor HTTP de Express en el puerto configurado.
       El puerto se lee de la variable de entorno PORT (defecto 4000).
   EN: Starts the Express HTTP server on the configured port.
       The port is read from the PORT environment variable (default 4000).
   ================================================================ */

import app from "./app.js";
import { port } from "./config/env.js";

// ES: Iniciar el servidor y mostrar la URL en la consola.
// EN: Start the server and print the URL to the console.
app.listen(port, () => {
  console.log(`GaIA backend escuchando en / listening on http://localhost:${port}`);
});
