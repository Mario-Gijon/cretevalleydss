import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet = null;

const isConnected = () => mongoose.connection.readyState === 1;

export const connectTestDatabase = async () => {
  if (!replSet) {
    replSet = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        storageEngine: "wiredTiger",
      },
    });
  }

  if (isConnected()) {
    return;
  }

  await mongoose.connect(replSet.getUri(), {
    dbName: "cretevalley_backend_tests",
  });
};

export const clearTestDatabase = async () => {
  if (!isConnected()) {
    return;
  }

  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({})
    )
  );
};

export const disconnectTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
};

export const setupMongoDbTestHooks = () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });
};
