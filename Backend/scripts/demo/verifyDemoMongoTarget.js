import mongoose from "mongoose";

import { connectDemoDatabaseOrThrow } from "./assertIsolatedDemoEnvironment.js";

try {
  const target = await connectDemoDatabaseOrThrow();
  console.log(`Read-only Mongo target verified: ${target.host}/${target.databaseName}.`);
} catch (error) {
  console.error("Demo Mongo target verification failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
