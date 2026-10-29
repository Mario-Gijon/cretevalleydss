import mongoose from "mongoose";

import { User } from "../../models/Users.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { buildCanonicalGlobalExpressionDomains } from "../../modules/expressionDomains/globalExpressionDomains.js";
import { connectDemoDatabaseOrThrow } from "./assertIsolatedDemoEnvironment.js";

const DEMO_USERS = [
  {
    name: "Demo Creator",
    emailKey: "DEMO_CREATOR_EMAIL",
    passwordKey: "DEMO_CREATOR_PASSWORD",
  },
  ...["A", "B", "C"].map((letter) => ({
    name: `Demo Expert ${letter}`,
    emailKey: `DEMO_EXPERT_${letter}_EMAIL`,
    passwordKey: `DEMO_EXPERT_${letter}_PASSWORD`,
  })),
];

const getDemoUsers = () => DEMO_USERS.map(({ name, emailKey, passwordKey }) => {
  const email = String(process.env[emailKey] || "").trim().toLowerCase();
  const password = process.env[passwordKey];
  if (!email.endsWith("@example.test") || !password || password.length < 12) {
    throw new Error(`Invalid local demo account configuration for ${emailKey}.`);
  }
  return { name, email, password };
});

const upsertDemoUser = async ({ name, email, password }) => {
  let user = await User.findOne({ email });
  const isNew = !user;
  user ||= new User({ email });
  user.name = name;
  user.university = "Crete Valley local demo";
  user.role = "user";
  user.accountConfirm = true;
  user.isDeleted = false;
  user.deletedAt = null;
  user.tokenConfirm = null;
  user.emailTokenConfirm = null;
  if (isNew || !(await user.comparePassword(password))) {
    user.password = password;
  }
  await user.save();
};

const seedDemoEnvironment = async () => {
  const target = await connectDemoDatabaseOrThrow();
  const users = getDemoUsers();

  for (const user of users) {
    await upsertDemoUser(user);
  }

  for (const domain of buildCanonicalGlobalExpressionDomains()) {
    await ExpressionDomain.updateOne(
      { owner: null, name: domain.name },
      { $set: { typeKey: domain.typeKey, definition: domain.definition } },
      { upsert: true },
    );
  }

  await ExpressionDomain.updateOne(
    { owner: null, name: "AHPSort I Saaty ratio scale" },
    {
      $set: {
        typeKey: "numericContinuous",
        definition: { min: 1 / 9, max: 9 },
      },
    },
    { upsert: true },
  );

  console.log(
    `Demo users and expression domains are ready in ${target.databaseName}; no Issues were inserted.`,
  );
};

try {
  await seedDemoEnvironment();
} catch (error) {
  console.error("Demo environment initialization failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
