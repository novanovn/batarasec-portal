import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://batarasec_portal:change-me@localhost:5433/batarasec_portal",
  },
  strict: true,
  verbose: true,
});
