import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set("strictQuery", true);
  return mongoose.connect(config.mongoUri);
}
