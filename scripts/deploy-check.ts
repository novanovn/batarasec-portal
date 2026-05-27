import "dotenv/config";

const required = [
  "DATABASE_URL",
  "VALKEY_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "LICENSE_SIGNING_SECRET",
  "SETTINGS_ENCRYPTION_KEY",
  "PORTAL_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

const placeholderPatterns = [
  /change-me/i,
  /change-this/i,
  /generate-/i,
  /example\.com/i,
  /localhost/i,
];

function hasValue(key: string) {
  return Boolean(process.env[key]?.trim());
}

function isPlaceholder(value: string) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function assertUrl(key: string, value: string, protocols: string[]) {
  try {
    const parsed = new URL(value);

    if (!protocols.includes(parsed.protocol)) {
      return `${key} must use one of: ${protocols.join(", ")}`;
    }
  } catch {
    return `${key} must be a valid URL`;
  }

  return null;
}

function main() {
  const failures: string[] = [];

  for (const key of required) {
    if (!hasValue(key)) {
      failures.push(`${key} is required`);
      continue;
    }

    const value = process.env[key] ?? "";

    if (isPlaceholder(value)) {
      failures.push(`${key} still looks like a placeholder`);
    }
  }

  if (hasValue("DATABASE_URL")) {
    const failure = assertUrl("DATABASE_URL", process.env.DATABASE_URL ?? "", ["postgres:", "postgresql:"]);

    if (failure) {
      failures.push(failure);
    }
  }

  if (hasValue("VALKEY_URL")) {
    const failure = assertUrl("VALKEY_URL", process.env.VALKEY_URL ?? "", ["redis:", "rediss:"]);

    if (failure) {
      failures.push(failure);
    }
  }

  if (hasValue("PORTAL_URL")) {
    const failure = assertUrl("PORTAL_URL", process.env.PORTAL_URL ?? "", ["https:"]);

    if (failure) {
      failures.push(failure);
    }
  }

  const smtpPort = Number(process.env.SMTP_PORT);

  if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65_535) {
    failures.push("SMTP_PORT must be a valid TCP port");
  }

  if (process.env.COOKIE_SECURE !== "true") {
    failures.push("COOKIE_SECURE must be true for production");
  }

  if (process.env.SMTP_DRY_RUN === "true") {
    failures.push("SMTP_DRY_RUN must be false for live SMTP validation");
  }

  if (failures.length) {
    console.error("Deployment readiness check failed:");

    for (const failure of failures) {
      console.error(`- ${failure}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log("Deployment readiness check passed");
}

main();
