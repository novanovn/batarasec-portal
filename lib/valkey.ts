import Redis from "ioredis";

let client: Redis | null = null;

export function getValkeyClient(): Redis {
  if (!client) {
    const url = process.env.VALKEY_URL;

    if (!url) {
      throw new Error("VALKEY_URL is required");
    }

    client = new Redis(url, {
      maxRetriesPerRequest: null,
    });
  }

  return client;
}
