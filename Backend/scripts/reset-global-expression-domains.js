import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { ExpressionDomain } from "../models/ExpressionDomain.js";
import { buildCanonicalGlobalExpressionDomains } from "../modules/expressionDomains/globalExpressionDomains.js";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const resetGlobalExpressionDomains = async () => {
  const canonicalDomains = buildCanonicalGlobalExpressionDomains();
  const connection = await connectDB();
  const deletedResult = await ExpressionDomain.deleteMany({ isGlobal: true });
  await ExpressionDomain.insertMany(canonicalDomains);

  console.log(`Database: ${connection.name}`);
  console.log(`Deleted global expression domains: ${deletedResult.deletedCount}`);
  console.log(
    `Inserted global expression domains (${canonicalDomains.length}): ${canonicalDomains
      .map(({ name }) => name)
      .join(", ")}`
  );
};

try {
  await resetGlobalExpressionDomains();
} catch (error) {
  console.error("Global expression domain reset failed:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
