import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose
  .connect(process.env.URI_MONGODB)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));