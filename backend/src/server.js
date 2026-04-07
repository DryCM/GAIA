import app from "./app.js";
import { port } from "./config/env.js";

app.listen(port, () => {
  console.log(`GaIA backend escuchando en http://localhost:${port}`);
});
