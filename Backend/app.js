import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

import authRouter from "./routes/auth.route.js";
import issueRouter from "./routes/issue.route.js";
import adminRouter from "./routes/admin.route.js";

const app = express();

/**
 * Construye la lista de orígenes permitidos para CORS.
 *
 * Filtra valores vacíos o no definidos para evitar ruido en la whitelist.
 *
 * @returns {string[]}
 */
const getAllowedOrigins = () => {
  return [
    process.env.ORIGIN_FRONT,
    process.env.ORIGIN_BACK,
    process.env.ORIGIN_APIMODELS,
    process.env.ORIGIN_CRETEVALLEY,
    process.env.ORIGIN_SULEIMAN,
  ].filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

/**
 * Valida si un origen está permitido por CORS.
 *
 * Permite solicitudes sin origen explícito para herramientas locales,
 * peticiones server-to-server o utilidades como Postman.
 *
 * @param {string | undefined} origin Origen de la request.
 * @param {(error: Error | null, allow?: boolean) => void} callback Callback de CORS.
 * @returns {void}
 */
const validateCorsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`Not allowed by CORS: ${origin}`));
};

app.use(
  cors({
    origin: validateCorsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/issues", issueRouter);
app.use("/api/admin", adminRouter);

/**
 * Devuelve 404 JSON para rutas de API no registradas.
 */
app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    msg: "API route not found",
  });
});

const distPath = path.join(process.cwd(), "dist");

app.use(express.static(distPath));

/**
 * Todas las rutas no API se delegan al frontend SPA.
 */
app.get("*", (_req, res) => {
  return res.sendFile(path.join(distPath, "index.html"));
});

export default app;