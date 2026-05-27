import { jwtVerify, SignJWT } from "jose";

export type LicenseTier = "community" | "pro" | "enterprise" | "demo";

export type LicenseClaims = {
  licenseId: string;
  customerId: string;
  tier: LicenseTier;
  features: string[];
  maxUsers?: number | null;
};

export type VerifiedLicenseClaims = LicenseClaims & {
  tokenId?: string;
  expiresAt?: Date;
};

function getLicenseSecret(): Uint8Array {
  const value = process.env.LICENSE_SIGNING_SECRET;

  if (!value) {
    throw new Error("LICENSE_SIGNING_SECRET is required");
  }

  return new TextEncoder().encode(value);
}

export async function signLicenseToken(
  claims: LicenseClaims,
  expiresAt?: Date | null,
): Promise<string> {
  const jwt = new SignJWT({
    licenseId: claims.licenseId,
    customerId: claims.customerId,
    tier: claims.tier,
    features: claims.features,
    maxUsers: claims.maxUsers ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.licenseId)
    .setIssuedAt();

  if (expiresAt) {
    jwt.setExpirationTime(Math.floor(expiresAt.getTime() / 1000));
  }

  return jwt.sign(getLicenseSecret());
}

export async function verifyLicenseToken(token: string): Promise<VerifiedLicenseClaims> {
  const { payload } = await jwtVerify(token, getLicenseSecret());

  if (
    !payload.licenseId ||
    !payload.customerId ||
    !payload.tier ||
    !Array.isArray(payload.features)
  ) {
    throw new Error("Invalid license token payload");
  }

  return {
    tokenId: payload.jti,
    licenseId: String(payload.licenseId),
    customerId: String(payload.customerId),
    tier: String(payload.tier) as LicenseTier,
    features: payload.features.map(String),
    maxUsers: typeof payload.maxUsers === "number" ? payload.maxUsers : null,
    expiresAt: typeof payload.exp === "number" ? new Date(payload.exp * 1000) : undefined,
  };
}

export function maskLicenseKey(licenseKey: string): string {
  if (licenseKey.length <= 16) {
    return "****";
  }

  return `${licenseKey.slice(0, 8)}...${licenseKey.slice(-8)}`;
}
