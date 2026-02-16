import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { channelIdentities, users } from "../db/schema.js";

export interface ResolvedIdentity {
  userId: string;
  verified: boolean;
}

/**
 * Resolve a channel sender ID to a CRM user.
 * Returns null if no mapping exists (user needs to authenticate).
 */
export async function resolveIdentity(
  channel: string,
  channelUserId: string,
): Promise<ResolvedIdentity | null> {
  const db = getDb();
  const [identity] = await db
    .select()
    .from(channelIdentities)
    .where(
      and(
        eq(channelIdentities.channel, channel),
        eq(channelIdentities.channelUserId, channelUserId),
      ),
    )
    .limit(1);

  if (!identity) return null;

  return {
    userId: identity.userId,
    verified: identity.verified,
  };
}

/**
 * Link a channel identity to an existing CRM user.
 */
export async function linkChannelIdentity(
  userId: string,
  channel: string,
  channelUserId: string,
  verified = true,
  channelDisplayName?: string,
): Promise<void> {
  const db = getDb();
  await db.insert(channelIdentities).values({
    id: nanoid(),
    userId,
    channel,
    channelUserId,
    channelDisplayName: channelDisplayName ?? null,
    verified,
    linkedAt: new Date().toISOString(),
  });
}

/**
 * Create a new user and link the channel identity in one step.
 * Used for first-time users who just authenticated.
 */
export async function createUserWithChannel(
  displayName: string,
  channel: string,
  channelUserId: string,
  email?: string,
  channelDisplayName?: string,
): Promise<string> {
  const db = getDb();
  const userId = nanoid();
  const now = new Date().toISOString();

  await db.insert(users).values({
    id: userId,
    displayName,
    email: email ?? null,
    role: "user",
    createdAt: now,
  });

  await db.insert(channelIdentities).values({
    id: nanoid(),
    userId,
    channel,
    channelUserId,
    channelDisplayName: channelDisplayName ?? null,
    verified: true,
    linkedAt: now,
  });

  return userId;
}

/**
 * Get all channel identities for a user.
 */
export async function getUserChannels(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(channelIdentities)
    .where(eq(channelIdentities.userId, userId));
}
