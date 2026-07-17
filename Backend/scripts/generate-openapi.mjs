import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import swaggerJSDoc from "swagger-jsdoc";
import {
  hasDocumentedOpenApiPaths,
  selectOpenApiSpecification,
} from "./openapi-generation.mjs";

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

const generatedSpecification = swaggerJSDoc(options);

const readExistingSpecification = () => {
  if (!fs.existsSync(outputFile)) {
    return null;
  }

  const existingContents = fs.readFileSync(outputFile, "utf8");

  if (!existingContents.trim()) {
    return null;
  }

  try {
    return JSON.parse(existingContents);
  } catch (error) {
    throw new Error(
      `The existing OpenAPI specification at ${outputFile} is invalid JSON; refusing to replace it after empty generation.`,
      { cause: error }
    );
  }
};

const existingSpecification = hasDocumentedOpenApiPaths(
  generatedSpecification
)
  ? null
  : readExistingSpecification();
const selection = selectOpenApiSpecification({
  generatedSpecification,
  existingSpecification,
  serverUrl,
});

if (selection.warning) {
  console.warn(`[openapi] WARNING: ${selection.warning}`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  outputFile,
  `${JSON.stringify(selection.specification, null, 2)}\n`,
  "utf8"
);

console.log(
  selection.source === "generated"
    ? `OpenAPI spec generated at ${outputFile}`
    : `OpenAPI spec preserved at ${outputFile}`
);
console.log(`Using server URL: ${serverUrl}`);
