import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { passkeyCredentials, users } from "../db/schema.js";

// RP (Relying Party) config — configured at init time
let rpName = "ClawCRM";
let rpId = "localhost";
let origin = "http://localhost:5173";

export function configurePasskey(cfg: {
  rpName?: string;
  rpId?: string;
  origin?: string;
}) {
  if (cfg.rpName) rpName = cfg.rpName;
  if (cfg.rpId) rpId = cfg.rpId;
  if (cfg.origin) origin = cfg.origin;
}

// In-memory challenge store (short-lived)
const challenges = new Map<string, { challenge: string; expiresAt: number }>();

function storeChallenge(userId: string, challenge: string) {
  challenges.set(userId, {
    challenge,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  });
}

function getAndDeleteChallenge(userId: string): string | null {
  const entry = challenges.get(userId);
  if (!entry) return null;
  challenges.delete(userId);
  if (entry.expiresAt < Date.now()) return null;
  return entry.challenge;
}

/**
 * Generate registration options for a new passkey.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function startRegistration(userId: string): Promise<any> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  // Get existing credentials to exclude
  const existing = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, userId));

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userName: user.email ?? user.displayName,
    userDisplayName: user.displayName,
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  storeChallenge(userId, options.challenge);
  return options;
}

/**
 * Verify a registration response and store the credential.
 */
export async function finishRegistration(
  userId: string,
  response: unknown,
) {
  const expectedChallenge = getAndDeleteChallenge(userId);
  if (!expectedChallenge) throw new Error("Challenge expired or not found");

  const verification = await verifyRegistrationResponse({
    response: response as Parameters<typeof verifyRegistrationResponse>[0]["response"],
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credential } = verification.registrationInfo;
  const db = getDb();

  await db.insert(passkeyCredentials).values({
    id: nanoid(),
    userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64"),
    counter: credential.counter,
    transports: credential.transports
      ? JSON.stringify(credential.transports)
      : null,
    createdAt: new Date().toISOString(),
  });

  return { verified: true };
}

/**
 * Generate authentication options for an existing user.
 * If userId is null, allows discoverable credentials (usernameless).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function startAuthentication(userId?: string): Promise<{ options: any; challengeKey: string }> {
  const db = getDb();
  let allowCredentials: Array<{ id: string; transports?: ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[] }> | undefined;

  if (userId) {
    const creds = await db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userId));

    allowCredentials = creds.map((c) => ({
      id: c.credentialId,
      transports: c.transports ? JSON.parse(c.transports) : undefined,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials,
    userVerification: "preferred",
  });

  // Store challenge with a temporary key
  const challengeKey = userId ?? `anon_${nanoid(12)}`;
  storeChallenge(challengeKey, options.challenge);

  return { options, challengeKey };
}

/**
 * Verify an authentication response. Returns the user ID on success.
 */
export async function finishAuthentication(
  challengeKey: string,
  response: unknown,
) {
  const expectedChallenge = getAndDeleteChallenge(challengeKey);
  if (!expectedChallenge) throw new Error("Challenge expired or not found");

  // Find the credential in the DB
  const resp = response as { id?: string; rawId?: string };
  const credentialId = resp.id ?? resp.rawId;
  if (!credentialId) throw new Error("No credential ID in response");

  const db = getDb();
  const [cred] = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.credentialId, credentialId))
    .limit(1);

  if (!cred) throw new Error("Unknown credential");

  const verification = await verifyAuthenticationResponse({
    response: response as Parameters<typeof verifyAuthenticationResponse>[0]["response"],
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
    credential: {
      id: cred.credentialId,
      publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64")),
      counter: cred.counter,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
    },
  });

  if (!verification.verified) {
    throw new Error("Authentication verification failed");
  }

  // Update counter
  await db
    .update(passkeyCredentials)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeyCredentials.id, cred.id));

  return { userId: cred.userId, verified: true };
}
