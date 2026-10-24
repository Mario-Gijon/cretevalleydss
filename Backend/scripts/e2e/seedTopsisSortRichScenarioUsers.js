import mongoose from "mongoose";

import { connectDB } from "../../database/db.js";
import { User } from "../../models/Users.js";
import { assertIsolatedE2eEnvironment } from "./assertIsolatedE2eEnvironment.js";

const scenarioUsers = [
  {
    name: "E2E Scenario Expert C",
    email: "scenario.expert.c@example.test",
    password: "E2eScenarioExpertC123",
  },
  {
    name: "E2E Scenario Expert D",
    email: "scenario.expert.d@example.test",
    password: "E2eScenarioExpertD123",
  },
].map((user) => ({
  ...user,
  university: "E2E Testing",
  role: "user",
  accountConfirm: true,
  isDeleted: false,
  deletedAt: null,
  tokenConfirm: null,
  emailTokenConfirm: null,
}));

const seedScenarioUsers = async () => {
  assertIsolatedE2eEnvironment();
  await connectDB();

  for (const scenarioUser of scenarioUsers) {
    const existingUser = await User.findOne({ email: scenarioUser.email });
    if (existingUser) {
      Object.assign(existingUser, scenarioUser);
      await existingUser.save();
    } else {
      await User.create(scenarioUser);
    }
  }

  console.log("[e2e] TOPSIS-Sort rich-scenario experts ready.");
};

try {
  await seedScenarioUsers();
} catch (error) {
  console.error("[e2e] Failed to seed TOPSIS-Sort rich-scenario experts:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
