import dotenv from "dotenv";
import mongoose from "mongoose";
import { writeFile } from "node:fs/promises";

dotenv.config({
  path: process.env.NODE_ENV
    ? `.env.${process.env.NODE_ENV}`
    : ".env",
});

const [{ connectDB }, { buildIssueHistoryDocument }, { buildAnalysisContext }] =
  await Promise.all([
    import("../database/db.js"),
    import("../modules/issues/history/index.js"),
    import("../modules/issues/resultsAnalysis/index.js"),
  ]);

const issueId = process.argv[2];

if (!issueId) {
  console.error(
    "Usage: NODE_ENV=development node scripts/export-analysis-context.js <issueId>"
  );
  process.exit(1);
}

try {
  await connectDB();

  console.log(`Building IssueHistoryDocument for ${issueId}...`);

  const history = await buildIssueHistoryDocument({
    issueId,
  });

  console.log("Building AnalysisContext...");

  const analysisContext = buildAnalysisContext(history);

  const outputPath = "./analysis-context.json";

  await writeFile(
    outputPath,
    JSON.stringify(analysisContext, null, 2),
    "utf8"
  );

  console.log("");
  console.log("AnalysisContext generated successfully.");
  console.log(`Output: ${outputPath}`);
  console.log(
    `Size: ${Buffer.byteLength(JSON.stringify(analysisContext), "utf8")} bytes`
  );
  console.log(`Rounds: ${analysisContext.rounds?.length ?? 0}`);
} catch (error) {
  console.error("Failed to generate AnalysisContext:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}