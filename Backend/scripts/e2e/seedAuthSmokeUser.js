import mongoose from "mongoose";

import { connectDB } from "../../database/db.js";
import { User } from "../../models/Users.js";

const E2E_DATABASE_NAME = "cretevalley_e2e";
const E2E_MONGO_HOST = "mongo-e2e";

const smokeUser = {
  name: "E2E Smoke User",
  university: "E2E Testing",
  email: "auth.smoke@example.test",
  password: "E2eAuthSmoke123",
  role: "user",
  accountConfirm: true,
  isDeleted: false,
  deletedAt: null,
  tokenConfirm: null,
  emailTokenConfirm: null,
};

const assertIsolatedE2eEnvironment = () => {
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

const seedAuthSmokeUser = async () => {
  assertIsolatedE2eEnvironment();
  await connectDB();

  const existingUser = await User.findOne({ email: smokeUser.email });

  if (existingUser) {
    Object.assign(existingUser, smokeUser);
    await existingUser.save();
  } else {
    await User.create(smokeUser);
  }

  console.log(`[e2e] Auth smoke user ready: ${smokeUser.email}`);
};

try {
  await seedAuthSmokeUser();
} catch (error) {
  console.error("[e2e] Failed to seed auth smoke user:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
