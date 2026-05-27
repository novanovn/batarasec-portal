import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  VALKEY_URL: z.string().url().optional(),
  PORTAL_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  VALKEY_URL: process.env.VALKEY_URL,
  PORTAL_URL: process.env.PORTAL_URL,
});
