import { eq, and, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { authSessions, users, auditLog } from "../db/schema.js";
import type { CrmUser } from "@clawcrm/shared";

/** Map a DB user row to a CrmUser. */
function toUser(u: typeof users.$inferSelect): CrmUser {
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    avatarUrl: u.avatarUrl ?? null,
    role: u.role,
    locale: u.locale,
    theme: u.theme,
    createdAt: u.createdAt,
    lastActiveAt: u.lastActiveAt ?? null,
  };
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Create a new session for an authenticated user.
 */
export async function createSession(
  userId: string,
  sessionType: "channel" | "web",
): Promise<string> {
  const db = getDb();
  const token = nanoid(48);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(authSessions).values({
    id: nanoid(),
    userId,
    sessionType,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  return token;
}

/**
 * Validate a session token and return the user if valid.
 */
export async function validateSession(
  token: string,
): Promise<CrmUser | null> {
  const db = getDb();
  const now = new Date().toISOString();

  const [session] = await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.token, token),
        gt(authSessions.expiresAt, now),
      ),
    )
    .limit(1);

  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return null;
  return toUser(user);
}

/**
 * Invalidate a session token (logout).
 */
export async function invalidateSession(token: string): Promise<void> {
  const db = getDb();
  await db.delete(authSessions).where(eq(authSessions.token, token));
}

/**
 * Remove all expired sessions from the database.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const { getRawDb } = await import("../db/client.js");
  const sqlite = getRawDb();
  const now = new Date().toISOString();
  const stmt = sqlite.prepare("DELETE FROM auth_sessions WHERE expires_at < ?");
  const res = stmt.run(now);
  return res.changes;
}

/**
 * Write an entry to the audit log.
 */
export async function writeAuditLog(
  userId: string | null,
  action: string,
  details?: string,
  channel?: string,
): Promise<void> {
  const db = getDb();
  await db.insert(auditLog).values({
    id: nanoid(),
    userId,
    action,
    details: details ?? null,
    channel: channel ?? null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Find a user by email.
 */
export async function findUserByEmail(email: string): Promise<CrmUser | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return null;
  return toUser(user);
}

/**
 * Find a user by ID.
 */
export async function findUserById(id: string): Promise<CrmUser | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return null;
  return toUser(user);
}
