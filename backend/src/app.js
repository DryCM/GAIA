import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { jsonErrorHandler } from "./middleware/jsonErrorHandler.js";
import { requestContext } from "./middleware/requestContext.js";
import aiRoutes from "./routes/aiRoutes.js";
import creditsRoutes from "./routes/creditsRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

const app = express();
const backendSrcDir = path.dirname(fileURLToPath(import.meta.url));
const webDistDir = path.resolve(backendSrcDir, "../../dist");
const webIndexFile = path.join(webDistDir, "index.html");
const hasWebBuild = fs.existsSync(webIndexFile);

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

if (hasWebBuild) {
	app.get("/", (req, res) => {
		res.status(200).send(`<!DOCTYPE html>
<html lang="es">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>GaIA</title>
		<style>
			:root {
				--sky-1: #dff7ff;
				--sky-2: #b8ebff;
				--violet-1: #9a7bff;
				--violet-2: #6a4dff;
				--ink: #15203b;
				--glass: rgba(255, 255, 255, 0.72);
			}
			* { box-sizing: border-box; }
			body {
				font-family: "Trebuchet MS", "Segoe UI", sans-serif;
				margin: 0;
				color: var(--ink);
				background: radial-gradient(circle at 20% 20%, var(--sky-1), transparent 40%),
					radial-gradient(circle at 80% 10%, #d8c9ff, transparent 35%),
					linear-gradient(135deg, #c4f0ff, #c6dbff 40%, #d3c2ff 100%);
				min-height: 100vh;
				overflow-x: hidden;
			}
			.bg-orb {
				position: fixed;
				border-radius: 999px;
				filter: blur(10px);
				opacity: 0.55;
				z-index: 0;
				animation: drift 14s ease-in-out infinite;
			}
			.orb-a {
				width: 280px;
				height: 280px;
				left: -70px;
				top: 50px;
				background: radial-gradient(circle, #81dcff, #60b8ff);
			}
			.orb-b {
				width: 320px;
				height: 320px;
				right: -120px;
				top: 120px;
				background: radial-gradient(circle, #b295ff, #7c5cff);
				animation-delay: -5s;
			}
			.orb-c {
				width: 240px;
				height: 240px;
				left: 35%;
				bottom: -80px;
				background: radial-gradient(circle, #8ff0ff, #8a7cff);
				animation-delay: -9s;
			}
			@keyframes drift {
				0% { transform: translateY(0) translateX(0) scale(1); }
				50% { transform: translateY(-20px) translateX(18px) scale(1.08); }
				100% { transform: translateY(0) translateX(0) scale(1); }
			}
			.wrap {
				position: relative;
				z-index: 1;
				max-width: 1080px;
				margin: 0 auto;
				padding: 28px 20px 24px;
			}
			.hero {
				background: linear-gradient(145deg, rgba(116, 211, 255, 0.32), rgba(132, 111, 255, 0.35));
				border: 1px solid rgba(255, 255, 255, 0.85);
				box-shadow: 0 24px 60px rgba(84, 90, 171, 0.25);
				border-radius: 24px;
				padding: 22px;
				backdrop-filter: blur(8px);
			}
			h1 {
				margin: 0;
				font-size: clamp(30px, 6vw, 54px);
				line-height: 1.05;
				letter-spacing: 0.4px;
			}
			.subtitle {
				margin: 10px 0 16px;
				font-size: 17px;
				color: #2d3f75;
			}
			.badges {
				display: flex;
				gap: 8px;
				flex-wrap: wrap;
				margin-bottom: 16px;
			}
			.badge {
				padding: 7px 11px;
				border-radius: 999px;
				font-size: 13px;
				font-weight: 700;
				background: rgba(255, 255, 255, 0.8);
				border: 1px solid rgba(255, 255, 255, 0.9);
			}
			.actions {
				display: flex;
				gap: 10px;
				flex-wrap: wrap;
			}
			a.btn {
				display: inline-block;
				padding: 11px 16px;
				border-radius: 12px;
				text-decoration: none;
				font-weight: 800;
			}
			a.btn-primary {
				background: linear-gradient(140deg, var(--violet-1), var(--violet-2));
				color: white;
				box-shadow: 0 10px 26px rgba(89, 63, 197, 0.45);
			}
			.preview {
				margin-top: 16px;
				padding: 12px;
				border-radius: 16px;
				background: var(--glass);
				border: 1px solid rgba(255, 255, 255, 0.85);
			}
			iframe {
				width: 100%;
				height: 64vh;
				min-height: 420px;
				border: 0;
				border-radius: 12px;
				background: white;
			}
		</style>
	</head>
	<body>
		<div class="bg-orb orb-a"></div>
		<div class="bg-orb orb-b"></div>
		<div class="bg-orb orb-c"></div>
		<div class="wrap">
			<div class="hero">
				<h1>GaIA Experience</h1>
				<p class="subtitle">Una sola URL, una vista más viva y elegante en celeste y morado.</p>
				<div class="badges">
					<span class="badge">App: /app</span>
					<span class="badge">API: /api/*</span>
					<span class="badge">Health: /health</span>
				</div>
				<div class="actions">
					<a class="btn btn-primary" href="/app">Abrir App Completa</a>
				</div>
				<div class="preview">
					<iframe src="/app" title="GaIA App"></iframe>
				</div>
			</div>
		</div>
	</body>
</html>`);
	});
	app.use(express.static(webDistDir));
	app.get("/status", (req, res) => {
		res.status(200).send(
			"<html><head><title>GaIA OK</title></head><body style='font-family:Segoe UI,sans-serif;padding:24px'><h1>GaIA esta activa</h1><p>Frontend: <a href='/'>/</a></p><p>API salud: <a href='/health'>/health</a></p><p>Chat API: POST /api/chat</p></body></html>"
		);
	});
	app.get(["/app", "/app/*"], (req, res) => {
		res.sendFile(webIndexFile);
	});
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;