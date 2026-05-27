import { createHash, randomUUID } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { accessCookieName, refreshCookieName } from "@/lib/auth-cookies";
import { getValkeyClient } from "@/lib/valkey";

export { accessCookieName, refreshCookieName };

export type AdminTokenPayload = {
  adminId: string;
  email: string;
  name: string;
  sessionId: string;
};

export type VerifiedAdminToken = AdminTokenPayload & {
  tokenId: string;
};

const accessTtlSeconds = 15 * 60;
const refreshTtlSeconds = 7 * 24 * 60 * 60;

function getSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET"): Uint8Array {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return new TextEncoder().encode(value);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function shouldUseSecureCookies(): boolean {
  return process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
}

export function getAccessMaxAge(): number {
  return accessTtlSeconds;
}

export function getRefreshMaxAge(): number {
  return refreshTtlSeconds;
}

export async function signAdminTokens(payload: Omit<AdminTokenPayload, "sessionId">) {
  const sessionId = randomUUID();
  const accessTokenId = randomUUID();
  const refreshTokenId = randomUUID();
  const issuedPayload = { ...payload, sessionId };

  const accessToken = await new SignJWT(issuedPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(accessTokenId)
    .setSubject(payload.adminId)
    .setIssuedAt()
    .setExpirationTime(`${accessTtlSeconds}s`)
    .sign(getSecret("JWT_ACCESS_SECRET"));

  const refreshToken = await new SignJWT(issuedPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(refreshTokenId)
    .setSubject(payload.adminId)
    .setIssuedAt()
    .setExpirationTime(`${refreshTtlSeconds}s`)
    .sign(getSecret("JWT_REFRESH_SECRET"));

  return {
    accessToken,
    refreshToken,
    sessionId,
    accessTokenId,
    refreshTokenId,
  };
}

export async function verifyAccessToken(token: string): Promise<VerifiedAdminToken> {
  const { payload } = await jwtVerify(token, getSecret("JWT_ACCESS_SECRET"));
  const tokenId = payload.jti;

  if (!tokenId || !payload.adminId || !payload.email || !payload.name || !payload.sessionId) {
    throw new Error("Invalid access token payload");
  }

  const valkey = getValkeyClient();
  const revoked = await valkey.exists(`auth:revoked:${hashToken(token)}`);
  const sessionRevoked = await valkey.exists(`auth:session:revoked:${String(payload.sessionId)}`);

  if (revoked || sessionRevoked) {
    throw new Error("Token revoked");
  }

  return {
    tokenId,
    adminId: String(payload.adminId),
    email: String(payload.email),
    name: String(payload.name),
    sessionId: String(payload.sessionId),
  };
}

export async function verifyRefreshToken(token: string): Promise<VerifiedAdminToken> {
  const { payload } = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
  const tokenId = payload.jti;

  if (!tokenId || !payload.adminId || !payload.email || !payload.name || !payload.sessionId) {
    throw new Error("Invalid refresh token payload");
  }

  const valkey = getValkeyClient();
  const revoked = await valkey.exists(`auth:revoked:${hashToken(token)}`);
  const sessionRevoked = await valkey.exists(`auth:session:revoked:${String(payload.sessionId)}`);

  if (revoked || sessionRevoked) {
    throw new Error("Token revoked");
  }

  return {
    tokenId,
    adminId: String(payload.adminId),
    email: String(payload.email),
    name: String(payload.name),
    sessionId: String(payload.sessionId),
  };
}

export async function revokeToken(token: string, ttlSeconds: number): Promise<void> {
  await getValkeyClient().set(`auth:revoked:${hashToken(token)}`, "1", "EX", ttlSeconds);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await getValkeyClient().set(`auth:session:revoked:${sessionId}`, "1", "EX", refreshTtlSeconds);
}
