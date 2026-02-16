import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import {
  permissions,
  users,
  groupMembers,
} from "../db/schema.js";
import type { Action } from "@clawcrm/shared";

/**
 * Check if a user has access to a specific resource.
 * Default-deny: returns false unless an explicit permission exists.
 */
export async function canAccess(
  userId: string,
  resource: string,
  resourceId: string,
  action: Action,
): Promise<boolean> {
  const db = getDb();

  // 1. Admins bypass all checks
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return false;
  if (user.role === "admin") return true;

  // 2. Check direct user permission
  const directPerm = await findPermission("user", userId, resource, resourceId, action);
  if (directPerm !== null) return directPerm;

  // 3. Check group permissions
  const userGroups = await db
    .select()
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  for (const membership of userGroups) {
    const groupPerm = await findPermission(
      "group",
      membership.groupId,
      resource,
      resourceId,
      action,
    );
    if (groupPerm !== null) return groupPerm;
  }

  // 4. Check role-based permission
  const rolePerm = await findPermission("role", user.role, resource, resourceId, action);
  if (rolePerm !== null) return rolePerm;

  // 5. Default deny
  return false;
}

/**
 * Check if the data belongs to the user (own-data access).
 */
export function isOwnData(userId: string, dataOwnerId: string): boolean {
  return userId === dataOwnerId;
}

/**
 * Check if a user can execute a specific skill.
 */
export async function canExecuteSkill(
  userId: string,
  skillId: string,
): Promise<boolean> {
  return canAccess(userId, "skill", skillId, "execute");
}

/**
 * Check if a user can access a specific module.
 */
export async function canAccessModule(
  userId: string,
  moduleId: string,
  action: Action = "read",
): Promise<boolean> {
  return canAccess(userId, "module", moduleId, action);
}

/**
 * Grant a permission.
 */
export async function grantPermission(
  subjectType: "user" | "group" | "role",
  subjectId: string,
  resource: string,
  resourceId: string,
  action: Action,
): Promise<void> {
  const db = getDb();
  const { nanoid } = await import("nanoid");

  await db.insert(permissions).values({
    id: nanoid(),
    subjectType,
    subjectId,
    resource,
    resourceId,
    action,
    allowed: true,
  });
}

/**
 * Revoke a permission.
 */
export async function revokePermission(permissionId: string): Promise<void> {
  const db = getDb();
  await db.delete(permissions).where(eq(permissions.id, permissionId));
}

/**
 * List all permissions for a subject.
 */
export async function listPermissions(
  subjectType: "user" | "group" | "role",
  subjectId: string,
) {
  const db = getDb();
  return db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.subjectType, subjectType),
        eq(permissions.subjectId, subjectId),
      ),
    );
}

// --- Internal helpers ---

async function findPermission(
  subjectType: string,
  subjectId: string,
  resource: string,
  resourceId: string,
  action: string,
): Promise<boolean | null> {
  const db = getDb();

  // Check specific resource ID first
  const [specific] = await db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.subjectType, subjectType as "user" | "group" | "role"),
        eq(permissions.subjectId, subjectId),
        eq(permissions.resource, resource),
        eq(permissions.resourceId, resourceId),
        eq(permissions.action, action as Action),
      ),
    )
    .limit(1);

  if (specific) return specific.allowed;

  // Check wildcard resource ID
  const [wildcard] = await db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.subjectType, subjectType as "user" | "group" | "role"),
        eq(permissions.subjectId, subjectId),
        eq(permissions.resource, resource),
        eq(permissions.resourceId, "*"),
        eq(permissions.action, action as Action),
      ),
    )
    .limit(1);

  if (wildcard) return wildcard.allowed;

  return null;
}
