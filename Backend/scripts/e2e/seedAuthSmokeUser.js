import mongoose from "mongoose";

import { connectDB } from "../../database/db.js";
import { User } from "../../models/Users.js";
import { assertIsolatedE2eEnvironment } from "./assertIsolatedE2eEnvironment.js";

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
