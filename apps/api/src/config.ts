import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/vedaai",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  hfToken: process.env.HF_TOKEN,
  hfModel: process.env.HF_MODEL ?? "mistralai/Mistral-7B-Instruct-v0.3",
};
