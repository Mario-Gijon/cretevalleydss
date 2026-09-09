export const E2E_DATABASE_NAME = "cretevalley_e2e";

const E2E_MONGO_HOST = "mongo-e2e";

export const assertIsolatedE2eEnvironment = () => {
  const mongoUri = process.env.MONGODB_URI || process.env.URI_MONGODB;
  const databaseName = process.env.MONGODB_DB_NAME;

  if (process.env.E2E_ISOLATED_STACK !== "true" || process.env.NODE_ENV !== "e2e") {
    throw new Error("Refusing to seed outside the isolated E2E stack.");
  }

  if (databaseName !== E2E_DATABASE_NAME) {
    throw new Error(`Refusing to seed unexpected database "${databaseName || "<missing>"}".`);
  }

  let hostname;
  try {
    hostname = new URL(mongoUri).hostname;
  } catch {
    throw new Error("Refusing to seed an invalid MongoDB URI.");
  }

  if (hostname !== E2E_MONGO_HOST) {
    throw new Error(`Refusing to seed non-E2E MongoDB host "${hostname || "<missing>"}".`);
  }
};
