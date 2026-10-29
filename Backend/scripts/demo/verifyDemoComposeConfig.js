import { readFileSync } from "node:fs";

const fail = (message) => {
  console.error(`Demo Compose check failed: ${message}`);
  process.exit(1);
};

let config;
try {
  config = JSON.parse(readFileSync(0, "utf8"));
} catch {
  fail("expected JSON from docker compose config --format json on stdin");
}

const services = config?.services || {};
const mongo = services["mongo-demo"];
const backend = services["backend-demo"];
const dms = services["decision-models-service-demo"];
const frontend = services["frontend-demo"];
const backendEnv = backend?.environment || {};
const dmsEnv = dms?.environment || {};

if (config?.name !== "cretevalley-demo") fail("Compose project name is not isolated");
if (mongo?.image !== "mongo:7.0") fail("dedicated mongo-demo service is missing");
if (!mongo?.command?.includes("--replSet") || !mongo.command.includes("cretevalley-demo-rs")) {
  fail("demo MongoDB must run as the expected single-node replica set for transaction support");
}
if (Array.isArray(mongo?.ports) && mongo.ports.length > 0) {
  fail("demo MongoDB must not publish a host port");
}
if (backend?.env_file || dms?.env_file || frontend?.env_file) {
  fail("demo services must not load environment files such as Backend/.env");
}
if (
  backendEnv.NODE_ENV !== "demo" ||
  backendEnv.DEMO_LOCAL_STACK !== "true" ||
  backendEnv.DEMO_MONGO_HOST !== "mongo-demo" ||
  backendEnv.DEMO_MONGODB_DB_NAME !== "cretevalley_demo" ||
  backendEnv.MONGODB_URI !== "mongodb://mongo-demo:27017/cretevalley_demo?replicaSet=cretevalley-demo-rs" ||
  backendEnv.MONGODB_DB_NAME !== "cretevalley_demo"
) {
  fail("Backend Mongo target is not the exact isolated local demo database");
}
if (
  dmsEnv.NODE_ENV !== "demo" ||
  dmsEnv.DEMO_LOCAL_STACK !== "true" ||
  dmsEnv.DEMO_MONGO_HOST !== "mongo-demo" ||
  dmsEnv.DEMO_MONGODB_DB_NAME !== "cretevalley_demo"
) {
  fail("DMS activation is not restricted to the isolated local demo stack");
}
if (frontend?.environment?.VITE_API_BACK !== "http://localhost:5002/api") {
  fail("Frontend does not point to the isolated local demo Backend");
}

console.log("Demo Compose verified: mongo-demo / cretevalley_demo, no Mongo host port, no habitual env file.");
