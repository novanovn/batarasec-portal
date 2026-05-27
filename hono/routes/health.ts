import { Hono } from "hono";
import { successResponse } from "@/lib/api-response";

export const healthRoute = new Hono().get("/health", (c) => {
  return c.json(
    successResponse({
      status: "ok",
      service: "batarasec-portal",
    }),
  );
});
