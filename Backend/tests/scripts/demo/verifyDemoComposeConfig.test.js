import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../../../scripts/demo/verifyDemoComposeConfig.js", import.meta.url));

const validConfig = () => ({
  name: "cretevalley-demo",
  services: {
    "mongo-demo": {
      image: "mongo:7.0",
      command: ["mongod", "--replSet", "cretevalley-demo-rs", "--bind_ip_all"],
      volumes: ["demo_mongo_data:/data/db"],
    },
    "backend-demo": {
      environment: {
        NODE_ENV: "demo",
        DEMO_LOCAL_STACK: "true",
        DEMO_MONGO_HOST: "mongo-demo",
        DEMO_MONGODB_DB_NAME: "cretevalley_demo",
        MONGODB_URI: "mongodb://mongo-demo:27017/cretevalley_demo?replicaSet=cretevalley-demo-rs",
        MONGODB_DB_NAME: "cretevalley_demo",
      },
    },
    "decision-models-service-demo": {
      environment: {
        NODE_ENV: "demo",
        DEMO_LOCAL_STACK: "true",
        DEMO_MONGO_HOST: "mongo-demo",
        DEMO_MONGODB_DB_NAME: "cretevalley_demo",
      },
    },
    "frontend-demo": { environment: { VITE_API_BACK: "http://localhost:5002/api" } },
  },
});

const runVerifier = (config) => spawnSync(process.execPath, [scriptPath], {
  input: JSON.stringify(config),
  encoding: "utf8",
});

describe("demo Compose target verification", () => {
  it("accepts the isolated local replica-set target", () => {
    const result = runVerifier(validConfig());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no Mongo host port");
  });

  it.each([
    ["Atlas URI", (config) => { config.services["backend-demo"].environment.MONGODB_URI = "mongodb+srv://atlas.example/cretevalley_demo"; }],
    ["development database", (config) => { config.services["backend-demo"].environment.MONGODB_DB_NAME = "cretevalley_dev"; }],
    ["published Mongo port", (config) => { config.services["mongo-demo"].ports = ["127.0.0.1:27018:27017"]; }],
    ["habitual backend env file", (config) => { config.services["backend-demo"].env_file = ["Backend/.env"]; }],
    ["standalone Mongo", (config) => { config.services["mongo-demo"].command = ["mongod", "--bind_ip_all"]; }],
  ])("rejects %s before the demo stack is trusted", (_label, mutate) => {
    const config = validConfig();
    mutate(config);
    const result = runVerifier(config);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Demo Compose check failed:");
  });
});
