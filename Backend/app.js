import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.route.js";
import issueRouter from "./routes/issue.route.js";
import adminRouter from "./routes/admin.route.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const BACKEND_STARTED_AT = new Date().toISOString();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getAllowedOrigins = () => {
  return [
    process.env.ORIGIN_FRONT,
    process.env.ORIGIN_BACK,
    process.env.ORIGIN_CRETEVALLEY,
    process.env.ORIGIN_SULEIMAN,
  ].filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

const validateCorsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`Not allowed by CORS: ${origin}`));
};

const generatedDocsPath = path.join(__dirname, "docs", "generated");
const openApiJsonPath = path.join(__dirname, "openapi", "openapi.json");
const redocHtmlPath = path.join(generatedDocsPath, "api-reference.html");
const jsdocDirPath = path.join(generatedDocsPath, "jsdoc");

app.use(
  cors({
    origin: validateCorsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend is healthy",
    data: {
      service: "backend",
      status: "ok",
      startedAt: BACKEND_STARTED_AT,
    },
  });
});

app.get("/api/openapi.json", (_req, res) => {
  return res.sendFile(openApiJsonPath);
});

app.get("/api/docs", (_req, res) => {
  return res.sendFile(redocHtmlPath);
});

app.use("/api/docs/jsdoc", express.static(jsdocDirPath));

app.use("/api/auth", authRouter);
app.use("/api/issues", issueRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

const distPath = path.join(__dirname, "dist");

app.use(express.static(distPath));

app.get("*", (_req, res) => {
  return res.sendFile(path.join(distPath, "index.html"));
});

app.use(errorHandler);

export default app;
