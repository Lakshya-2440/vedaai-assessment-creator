import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/vedaai",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  hfToken: process.env.HF_TOKEN,
  hfModel: process.env.HF_MODEL ?? "meta-llama/Llama-3.1-8B-Instruct",
};
