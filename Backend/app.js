import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

import authRouter from "./routes/auth.route.js";
import issueRouter from "./routes/issue.route.js";
import adminRouter from "./routes/admin.route.js";
import { errorHandler } from "./middlewares/errorHandler.js";

/**
 * @callback CorsDecisionCallback
 * @param {?Error} error Error de validación de origen.
 * @param {boolean} [allow] Indica si el origen está permitido.
 * @returns {void}
 */

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
 * @param {CorsDecisionCallback} callback Callback de CORS.
 * @returns {void}
 */
const validateCorsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`Not allowed by CORS: ${origin}`));
};

const swaggerOptions = {
  failOnErrors: false,
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Crete Valley DSS Backend API",
      version: "1.0.0",
      description:
        "HTTP API for the Crete Valley DSS backend. Generated from route annotations and shared OpenAPI components.",
    },
    servers: [
      {
        url:
          process.env.OPENAPI_SERVER_URL ||
          `http://localhost:${process.env.PORT || 6000}/api`,
        description: "Configured API server",
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication, account, profile and session endpoints.",
      },
      {
        name: "Issues",
        description:
          "Issue lifecycle, evaluations, notifications, expression domains and scenarios.",
      },
      {
        name: "Admin",
        description: "Administrative endpoints for experts, issues and panel operations.",
      },
    ],
  },
  apis: ["./openapi.components.js", "./routes/*.js", "./routes/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

app.use(
  cors({
    origin: validateCorsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/openapi.json", (_req, res) => {
  return res.json(swaggerSpec);
});

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Crete Valley DSS API Docs",
  })
);

app.use("/api/auth", authRouter);
app.use("/api/issues", issueRouter);
app.use("/api/admin", adminRouter);

/**
 * Devuelve 404 JSON para rutas de API no registradas.
 */
app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
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

/**
 * Middleware global de errores.
 * Debe ir al final para capturar errores lanzados en rutas y middlewares.
 */
app.use(errorHandler);

export default app;
