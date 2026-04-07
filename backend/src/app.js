import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { jsonErrorHandler } from "./middleware/jsonErrorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import aiRoutes from "./routes/aiRoutes.js";
import creditsRoutes from "./routes/creditsRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

const app = express();

app.use(requestContext);
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(jsonErrorHandler);

app.use(systemRoutes);
app.use("/api", metaRoutes);
app.use("/api", creditsRoutes);
app.use("/api", aiRoutes);
app.use("/api/v1", metaRoutes);
app.use("/api/v1", creditsRoutes);
app.use("/api/v1", aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;