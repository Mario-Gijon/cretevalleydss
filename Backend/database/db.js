import mongoose from "mongoose";

const MONGOOSE_CONNECTED_STATE = 1;
const MONGOOSE_CONNECTING_STATE = 2;

const isMongoConnectionActive = () => {
  return (
    mongoose.connection.readyState === MONGOOSE_CONNECTED_STATE ||
    mongoose.connection.readyState === MONGOOSE_CONNECTING_STATE
  );
};

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.URI_MONGODB;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!mongoUri) {
    throw new Error("MONGODB_URI or URI_MONGODB is not defined");
  }

  if (isMongoConnectionActive()) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri, dbName ? { dbName } : undefined);
  console.log("Connected to MongoDB");

  return mongoose.connection;
};
