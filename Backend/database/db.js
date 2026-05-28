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
  const mongoUri = process.env.URI_MONGODB;

  if (!mongoUri) {
    throw new Error("URI_MONGODB is not defined");
  }

  if (isMongoConnectionActive()) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  return mongoose.connection;
};