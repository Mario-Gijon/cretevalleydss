import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { buildCanonicalSaatyExpressionDomain } from "../modules/expressionDomains/types/numericSaaty/globalDomain.js";
import { ExpressionDomain } from "../models/ExpressionDomain.js";
import { syncGlobalSaatyExpressionDomain } from "../modules/expressionDomains/syncGlobalSaatyExpressionDomain.js";

const TARGET_DATABASE = "cretevalleydss_develop";
const EXPECTED_TARGET_ENV = "EXPRESSION_DOMAIN_SYNC_TARGET";
const scriptArgs = process.argv.slice(2);
const APPLY = scriptArgs[0] === "--apply";
const validArgs = scriptArgs.length <= 1 && scriptArgs.every(
  (argument) => argument === "--apply" || argument === "--dry-run"
);

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const assertDevelopmentTarget = () => {
  if (!validArgs) throw new Error("Only --dry-run (default) and --apply are supported.");
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Set NODE_ENV=development before synchronizing the Saaty expression domain.");
  }
  if (
    process.env[EXPECTED_TARGET_ENV] !== TARGET_DATABASE ||
    process.env.MONGODB_DB_NAME !== TARGET_DATABASE
  ) {
    throw new Error(
      `Refusing to connect: both ${EXPECTED_TARGET_ENV} and MONGODB_DB_NAME must equal ${TARGET_DATABASE}.`
    );
  }
}

const run = async () => {
  assertDevelopmentTarget();
  const connection = await connectDB();
  if (connection.name !== TARGET_DATABASE) {
    throw new Error(`Connected database ${connection.name} does not match the approved development target.`);
  }

  const canonical = buildCanonicalSaatyExpressionDomain();
  const filter = { owner: null, name: canonical.name };
  const existing = await ExpressionDomain.findOne(filter).lean().exec();
  const current = existing
    ? { typeKey: existing.typeKey, definition: existing.definition }
    : null;
  const expected = { typeKey: canonical.typeKey, definition: canonical.definition };
  const changed = JSON.stringify(current) !== JSON.stringify(expected);

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    database: connection.name,
    operation: existing ? (changed ? "update-one-global-domain" : "no-op") : "create-one-global-domain",
    domainName: canonical.name,
    existingId: existing?._id?.toString() ?? null,
    current,
    expected,
    unrelatedDomains: "untouched",
    issuesAndSnapshots: "untouched",
  }, null, 2));

  if (!APPLY || !changed) return;
  const result = await syncGlobalSaatyExpressionDomain();
  console.log(JSON.stringify({
    persistedId: result.domain?._id?.toString() ?? null,
    created: result.created,
    modified: result.modified,
    persistedTypeKey: result.domain?.typeKey ?? null,
    persistedDefinition: result.domain?.definition ?? null,
  }, null, 2));
};

try {
  await run();
} catch (error) {
  console.error("Saaty expression domain synchronization failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
}
