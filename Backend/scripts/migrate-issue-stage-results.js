import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { IssueStageResult } from "../models/IssueStageResults.js";
import {
  buildMigratedIssueStageResultFields,
  isIssueStageResultMigrated,
  LEGACY_ISSUE_STAGE_RESULT_FIELDS,
} from "../modules/issues/stageResults/migrateIssueStageResultDocument.js";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const run = async () => {
  const connection = await connectDB();
  const documents = await IssueStageResult.collection.find({}).toArray();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const document of documents) {
    if (isIssueStageResultMigrated(document)) {
      skippedCount += 1;
      continue;
    }

    await IssueStageResult.collection.updateOne(
      { _id: document._id },
      {
        $set: buildMigratedIssueStageResultFields(document),
        $unset: Object.fromEntries(
          LEGACY_ISSUE_STAGE_RESULT_FIELDS.map((field) => [field, ""])
        ),
      }
    );
    migratedCount += 1;
  }

  console.log(`Database: ${connection.name}`);
  console.log(`Migrated IssueStageResult documents: ${migratedCount}`);
  console.log(`Already migrated IssueStageResult documents: ${skippedCount}`);
};

try {
  await run();
} catch (error) {
  console.error("IssueStageResult migration failed:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
