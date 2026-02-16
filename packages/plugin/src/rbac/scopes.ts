import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { projectMembers, groupMembers } from "../db/schema.js";
import { canAccess } from "./permission-engine.js";
import type { Action } from "@clawcrm/shared";

/**
 * Get a data scope filter: returns the userId(s) whose data the user may see.
 * For non-admins, typically just their own userId.
 * For admins or users with explicit cross-permission, returns broader scopes.
 */
export async function getDataScope(
  userId: string,
  resource: string,
): Promise<string[]> {
  // Own data is always in scope
  const scope = [userId];

  // Check for wildcard read on the resource
  const hasWildcardRead = await canAccess(userId, resource, "*", "read");
  if (hasWildcardRead) {
    // Wildcard means "all data" — return empty array to signal no filter
    return [];
  }

  return scope;
}

/**
 * Get project IDs that a user has access to.
 */
export async function getAccessibleProjectIds(userId: string): Promise<string[]> {
  const db = getDb();
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  return memberships.map((m) => m.projectId);
}

/**
 * Get group IDs that a user belongs to.
 */
export async function getUserGroupIds(userId: string): Promise<string[]> {
  const db = getDb();
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  return memberships.map((m) => m.groupId);
}
