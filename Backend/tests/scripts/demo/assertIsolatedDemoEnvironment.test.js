import { describe, expect, it, vi } from "vitest";

import {
  assertDemoEnvironmentConfiguration,
  assertDemoMongoConnection,
} from "../../../scripts/demo/assertIsolatedDemoEnvironment.js";

const demoEnv = () => ({
  NODE_ENV: "demo",
  DEMO_LOCAL_STACK: "true",
  DEMO_MONGO_HOST: "mongo-demo",
  DEMO_MONGODB_DB_NAME: "cretevalley_demo",
  MONGODB_DB_NAME: "cretevalley_demo",
  MONGODB_URI: "mongodb://mongo-demo:27017/cretevalley_demo?replicaSet=cretevalley-demo-rs",
});

const demoConnection = () => ({
  readyState: 1,
  host: "mongo-demo",
  name: "cretevalley_demo",
  client: { topology: { description: { servers: new Map([["mongo-demo:27017", {}]]) } } },
  db: {
    admin: () => ({
      command: vi.fn(async (command) => command.ping
        ? { ok: 1 }
        : { ok: 1, isWritablePrimary: true, setName: "cretevalley-demo-rs" }),
    }),
  },
});

describe("isolated local demo Mongo guard", () => {
  it("accepts only the exact local demo Mongo URI and database", () => {
    expect(assertDemoEnvironmentConfiguration(demoEnv())).toEqual({
      host: "mongo-demo",
      databaseName: "cretevalley_demo",
    });
  });

  it.each([
    ["Atlas URI", { MONGODB_URI: "mongodb+srv://cluster.example.test/cretevalley_demo" }],
    ["remote host", { MONGODB_URI: "mongodb://mongo.example.test:27017/cretevalley_demo?replicaSet=cretevalley-demo-rs" }],
    ["wrong database", { MONGODB_DB_NAME: "cretevalley_dev" }],
    ["URI database mismatch", { MONGODB_URI: "mongodb://mongo-demo:27017/other?replicaSet=cretevalley-demo-rs" }],
    ["URI credentials", { MONGODB_URI: "mongodb://user:pass@mongo-demo:27017/cretevalley_demo?replicaSet=cretevalley-demo-rs" }],
    ["wrong replica set", { MONGODB_URI: "mongodb://mongo-demo:27017/cretevalley_demo?replicaSet=other" }],
    ["production mode", { NODE_ENV: "production" }],
    ["missing authorization", { DEMO_LOCAL_STACK: undefined }],
  ])("rejects %s before any database operation", (_label, overrides) => {
    const env = { ...demoEnv(), ...overrides };
    expect(() => assertDemoEnvironmentConfiguration(env)).toThrow(/Refusing demo database access/);
  });

  it("accepts the guarded local primary after a read-only ping and hello check", async () => {
    await expect(assertDemoMongoConnection(demoConnection(), demoEnv())).resolves.toEqual({
      host: "mongo-demo",
      databaseName: "cretevalley_demo",
      writablePrimary: true,
    });
  });

  it.each([
    ["connected remote host", { host: "atlas.example.test" }],
    ["connected wrong database", { name: "cretevalley_dev" }],
    ["remote topology", {
      client: { topology: { description: { servers: new Map([["atlas.example.test:27017", {}]]) } } },
    }],
  ])("rejects %s after connect", async (_label, overrides) => {
    await expect(assertDemoMongoConnection({ ...demoConnection(), ...overrides }, demoEnv()))
      .rejects.toThrow(/Refusing demo database access/);
  });
});
