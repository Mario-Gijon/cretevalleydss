import dotenv from "dotenv";
import mongoose from "mongoose";

import { connectDB } from "../database/db.js";
import { resetGlobalExpressionDomains } from "../modules/expressionDomains/resetGlobalExpressionDomains.js";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const run = async () => {
  const connection = await connectDB();
  const result = await resetGlobalExpressionDomains();

  console.log(`Database: ${connection.name}`);
  console.log(`Deleted global expression domains: ${result.deletedCount}`);
  console.log(`Inserted global expression domains: ${result.insertedCount}`);
  console.log(`Inserted names: ${result.insertedNames.join(", ")}`);
};

try {
  await run();
} catch (error) {
  console.error("Global expression domain reset failed:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
