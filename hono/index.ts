import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { errorResponse } from "@/lib/api-response";
import { rateLimit } from "./middleware/rate-limit";
import { auditRoute } from "./routes/audit";
import { authRoute } from "./routes/auth";
import { customersRoute } from "./routes/customers";
import { healthRoute } from "./routes/health";
import { licensesRoute } from "./routes/licenses";
import { settingsRoute } from "./routes/settings";

export const app = new Hono().basePath("/api");

app.use("*", requestId());
app.use("*", secureHeaders());
app.use(
  "*",
  rateLimit({
    keyPrefix: "api:general",
    limit: 100,
    windowSeconds: 15 * 60,
  }),
);

app.route("/", healthRoute);
app.route("/audit", auditRoute);
app.route("/auth", authRoute);
app.route("/customers", customersRoute);
app.route("/licenses", licensesRoute);
app.route("/settings", settingsRoute);

app.notFound((c) => {
  return c.json(errorResponse("NOT_FOUND", "Route not found"), 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.json(errorResponse("INTERNAL_SERVER_ERROR", "Internal server error"), 500);
});

export type AppType = typeof app;
