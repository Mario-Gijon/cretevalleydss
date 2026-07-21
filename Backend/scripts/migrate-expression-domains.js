import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { ExpressionDomain } from "../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";
import {
  buildMigratedExpressionDomainFields,
  buildMigratedIssueExpressionDomainFields,
  getExpressionDomainMigrationProblem,
  getIssueExpressionDomainMigrationProblem,
  LEGACY_EXPRESSION_DOMAIN_FIELDS,
  migrateExpressionDomainIndexes,
} from "../modules/expressionDomains/migrateExpressionDomainDocuments.js";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const formatProblems = (label, problems) =>
  `${label}:\n${problems.map((problem) => JSON.stringify(problem)).join("\n")}`;

const run = async () => {
  const connection = await connectDB();
  const [domains, snapshots] = await Promise.all([
    ExpressionDomain.collection.find({}).toArray(),
    IssueExpressionDomain.collection.find({}).toArray(),
  ]);
  const domainProblems = domains
    .map(getExpressionDomainMigrationProblem)
    .filter(Boolean);
  const snapshotProblems = snapshots
    .map(getIssueExpressionDomainMigrationProblem)
    .filter(Boolean);

  if (domainProblems.length || snapshotProblems.length) {
    const messages = [];
    if (domainProblems.length) {
      messages.push(formatProblems("Inconsistent ExpressionDomain ownership", domainProblems));
    }
    if (snapshotProblems.length) {
      messages.push(formatProblems("IssueExpressionDomain snapshots missing provenance", snapshotProblems));
    }
    throw new Error(messages.join("\n\n"));
  }

  const now = new Date();
  for (const domain of domains) {
    await ExpressionDomain.collection.updateOne(
      { _id: domain._id },
      {
        $set: buildMigratedExpressionDomainFields(domain, now),
        $unset: Object.fromEntries(
          LEGACY_EXPRESSION_DOMAIN_FIELDS.map((field) => [field, ""])
        ),
      }
    );
  }
  for (const snapshot of snapshots) {
    await IssueExpressionDomain.collection.updateOne(
      { _id: snapshot._id },
      { $set: buildMigratedIssueExpressionDomainFields(snapshot, now) }
    );
  }

  await migrateExpressionDomainIndexes({ collection: ExpressionDomain.collection });
  console.log(`Database: ${connection.name}`);
  console.log(`Migrated ExpressionDomain documents: ${domains.length}`);
  console.log(`Verified IssueExpressionDomain documents: ${snapshots.length}`);
};

try {
  await run();
} catch (error) {
  console.error("Expression-domain migration failed:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
