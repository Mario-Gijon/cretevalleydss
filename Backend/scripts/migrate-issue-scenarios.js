import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { IssueScenario } from "../models/IssueScenarios.js";
import {
  buildMigratedIssueScenarioFields,
  isIssueScenarioMigrated,
  LEGACY_ISSUE_SCENARIO_FIELDS,
} from "../modules/issues/scenarios/migrateIssueScenarioDocument.js";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const run = async () => {
  const connection = await connectDB();
  const scenarios = await IssueScenario.collection.find({}).toArray();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const scenario of scenarios) {
    if (isIssueScenarioMigrated(scenario)) {
      skippedCount += 1;
      continue;
    }

    await IssueScenario.collection.updateOne(
      { _id: scenario._id },
      {
        $set: buildMigratedIssueScenarioFields(scenario),
        $unset: Object.fromEntries(
          LEGACY_ISSUE_SCENARIO_FIELDS.map((field) => [field, ""])
        ),
      }
    );
    migratedCount += 1;
  }

  console.log(`Database: ${connection.name}`);
  console.log(`Migrated IssueScenario documents: ${migratedCount}`);
  console.log(`Already migrated IssueScenario documents: ${skippedCount}`);
};

try {
  await run();
} catch (error) {
  console.error("IssueScenario migration failed:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
