import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import swaggerJSDoc from "swagger-jsdoc";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const serverUrl = process.env.OPENAPI_SERVER_URL || "/api";

const outputDir = path.resolve("openapi");
const outputFile = path.join(outputDir, "openapi.json");

const options = {
  failOnErrors: false,
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Crete Valley DSS Backend API",
      version: "1.0.0",
      description:
        "HTTP API for the Crete Valley DSS backend. This specification is generated from route annotations and shared OpenAPI components.",
    },
    servers: [
      {
        url: serverUrl,
        description: "Current API server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
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

const spec = swaggerJSDoc(options);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2), "utf8");

console.log(`OpenAPI spec generated at ${outputFile}`);
console.log(`Using server URL: ${serverUrl}`);
