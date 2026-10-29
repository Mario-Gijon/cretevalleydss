import mongoose from "mongoose";

import { connectDB } from "../../database/db.js";

export const DEMO_DATABASE_NAME = "cretevalley_demo";
export const DEMO_MONGO_HOST = "mongo-demo";
export const DEMO_MONGO_REPLICA_SET = "cretevalley-demo-rs";

const getDemoMongoUri = (env) => env.MONGODB_URI || env.URI_MONGODB;

export const assertDemoEnvironmentConfiguration = (env = process.env) => {
  if (
    env.NODE_ENV !== "demo" ||
    env.DEMO_LOCAL_STACK !== "true" ||
    env.DEMO_MONGO_HOST !== DEMO_MONGO_HOST ||
    env.DEMO_MONGODB_DB_NAME !== DEMO_DATABASE_NAME
  ) {
    throw new Error("Refusing demo database access outside the explicitly isolated local demo stack.");
  }

  if (env.MONGODB_DB_NAME !== DEMO_DATABASE_NAME) {
    throw new Error("Refusing demo database access because MONGODB_DB_NAME is not the dedicated demo database.");
  }

  let mongoUrl;
  try {
    mongoUrl = new URL(getDemoMongoUri(env));
  } catch {
    throw new Error("Refusing demo database access because MONGODB_URI is missing or invalid.");
  }

  if (
    mongoUrl.protocol !== "mongodb:" ||
    mongoUrl.hostname !== DEMO_MONGO_HOST ||
    mongoUrl.port !== "27017" ||
    mongoUrl.pathname !== `/${DEMO_DATABASE_NAME}` ||
    mongoUrl.username ||
    mongoUrl.password ||
    mongoUrl.search !== `?replicaSet=${DEMO_MONGO_REPLICA_SET}` ||
    mongoUrl.hash
  ) {
    throw new Error("Refusing demo database access because the MongoDB target is not the exact local demo endpoint.");
  }

  return {
    host: DEMO_MONGO_HOST,
    databaseName: DEMO_DATABASE_NAME,
  };
};

export const assertDemoMongoConnection = async (connection, env = process.env) => {
  assertDemoEnvironmentConfiguration(env);

  if (
    !connection ||
    connection.readyState !== 1 ||
    connection.host !== DEMO_MONGO_HOST ||
    connection.name !== DEMO_DATABASE_NAME
  ) {
    throw new Error("Refusing demo database access because the connected MongoDB host or database does not match the local demo target.");
  }

  const servers = connection.client?.topology?.description?.servers;
  const serverAddresses = servers ? [...servers.keys()] : [];
  if (
    serverAddresses.length === 0 ||
    serverAddresses.some((address) => {
      let parsedAddress;
      try {
        parsedAddress = new URL(`mongodb://${address}`);
      } catch {
        return true;
      }
      return parsedAddress.hostname !== DEMO_MONGO_HOST || parsedAddress.port !== "27017";
    })
  ) {
    throw new Error("Refusing demo database access because the MongoDB driver topology is not limited to the local demo container.");
  }

  const [ping, hello] = await Promise.all([
    connection.db.admin().command({ ping: 1 }),
    connection.db.admin().command({ hello: 1 }),
  ]);
  if (
    ping?.ok !== 1 ||
    hello?.ok !== 1 ||
    hello?.isWritablePrimary !== true ||
    hello?.setName !== DEMO_MONGO_REPLICA_SET
  ) {
    throw new Error("Refusing demo database access because the local MongoDB read-only target check did not pass.");
  }

  return {
    host: DEMO_MONGO_HOST,
    databaseName: DEMO_DATABASE_NAME,
    writablePrimary: true,
  };
};

export const connectDemoDatabaseOrThrow = async () => {
  assertDemoEnvironmentConfiguration();

  try {
    await connectDB();
    return await assertDemoMongoConnection(mongoose.connection);
  } catch (error) {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    throw error;
  }
};
