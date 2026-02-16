import { Type } from "@sinclair/typebox";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import { getDb } from "../db/client.js";
import {
  users,
  permissions,
  pairedInstances,
  crmModules,
} from "../db/schema.js";
import { canAccess, grantPermission, revokePermission } from "../rbac/permission-engine.js";
import { writeAuditLog } from "../auth/auth-service.js";
import type { Action } from "@clawcrm/shared";

export const crmAdminPermissionsTool = {
  name: "crm_admin_permissions",
  description:
    "Manage permissions (grant/revoke). Admin only.",
  parameters: Type.Object({
    action: Type.String({ description: "Action: grant, revoke, list" }),
    subjectType: Type.Optional(
      Type.String({ description: "user, group, or role" }),
    ),
    subjectId: Type.Optional(Type.String()),
    resource: Type.Optional(Type.String()),
    resourceId: Type.Optional(Type.String()),
    permAction: Type.Optional(
      Type.String({ description: "read, write, execute, admin" }),
    ),
    permissionId: Type.Optional(
      Type.String({ description: "Permission ID for revoke" }),
    ),
  }),
  async execute(
    userId: string,
    params: {
      action: string;
      subjectType?: string;
      subjectId?: string;
      resource?: string;
      resourceId?: string;
      permAction?: string;
      permissionId?: string;
    },
  ) {
    const isAdmin = await canAccess(userId, "admin", "*", "admin");
    if (!isAdmin) {
      return { content: [{ type: "text", text: "Admin access required." }] };
    }

    const db = getDb();

    switch (params.action) {
      case "grant": {
        if (
          !params.subjectType ||
          !params.subjectId ||
          !params.resource ||
          !params.resourceId ||
          !params.permAction
        ) {
          return {
            content: [
              {
                type: "text",
                text: "Required: subjectType, subjectId, resource, resourceId, permAction",
              },
            ],
          };
        }
        await grantPermission(
          params.subjectType as "user" | "group" | "role",
          params.subjectId,
          params.resource,
          params.resourceId,
          params.permAction as Action,
        );
        await writeAuditLog(
          userId,
          "grant_permission",
          `${params.subjectType}:${params.subjectId} -> ${params.resource}:${params.resourceId}:${params.permAction}`,
        );
        return { content: [{ type: "text", text: "Permission granted." }] };
      }

      case "revoke": {
        if (!params.permissionId) {
          return {
            content: [{ type: "text", text: "permissionId is required." }],
          };
        }
        await revokePermission(params.permissionId);
        await writeAuditLog(userId, "revoke_permission", `id=${params.permissionId}`);
        return { content: [{ type: "text", text: "Permission revoked." }] };
      }

      case "list": {
        const allPerms = await db.select().from(permissions);
        return {
          content: [{ type: "text", text: JSON.stringify(allPerms, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown action: ${params.action}` }],
        };
    }
  },
};

export const crmAdminUsersTool = {
  name: "crm_admin_users",
  description: "Manage users. Admin only.",
  parameters: Type.Object({
    action: Type.String({ description: "Action: list, setRole" }),
    userId: Type.Optional(Type.String()),
    role: Type.Optional(Type.String({ description: "admin, user, guest" })),
  }),
  async execute(
    callerId: string,
    params: { action: string; userId?: string; role?: string },
  ) {
    const isAdmin = await canAccess(callerId, "admin", "*", "admin");
    if (!isAdmin) {
      return { content: [{ type: "text", text: "Admin access required." }] };
    }

    const db = getDb();

    switch (params.action) {
      case "list": {
        const allUsers = await db.select().from(users);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                allUsers.map((u) => ({
                  id: u.id,
                  name: u.displayName,
                  email: u.email,
                  role: u.role,
                })),
                null,
                2,
              ),
            },
          ],
        };
      }

      case "setRole": {
        if (!params.userId || !params.role) {
          return {
            content: [{ type: "text", text: "userId and role required." }],
          };
        }
        await db
          .update(users)
          .set({ role: params.role as "admin" | "user" | "guest" })
          .where(eq(users.id, params.userId));
        await writeAuditLog(
          callerId,
          "set_user_role",
          `user=${params.userId} role=${params.role}`,
        );
        return {
          content: [
            { type: "text", text: `User ${params.userId} role set to ${params.role}.` },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown action: ${params.action}` }],
        };
    }
  },
};

export const crmAdminInstanceKeyTool = {
  name: "crm_admin_instance_key",
  description:
    "Generate or rotate instance keys for frontend pairing. Admin only.",
  parameters: Type.Object({
    action: Type.String({
      description: "Action: generate, rotate, list",
    }),
    instanceId: Type.Optional(
      Type.String({ description: "Instance ID for rotate" }),
    ),
  }),
  async execute(
    userId: string,
    params: { action: string; instanceId?: string },
  ) {
    const isAdmin = await canAccess(userId, "admin", "*", "admin");
    if (!isAdmin) {
      return { content: [{ type: "text", text: "Admin access required." }] };
    }

    const db = getDb();

    switch (params.action) {
      case "generate": {
        const instanceKey = `ik_${nanoid(32)}`;
        const id = nanoid();

        await db.insert(pairedInstances).values({
          id,
          instanceKeyHash: createHash("sha256")
            .update(instanceKey)
            .digest("hex"),
          wsTokenHash: null,
          origin: null,
          fingerprint: null,
          status: "pending",
          pairedAt: null,
          lastSeenAt: null,
        });

        await writeAuditLog(userId, "generate_instance_key", `instanceId=${id}`);

        return {
          content: [
            {
              type: "text",
              text: `Instance key generated:\n\n${instanceKey}\n\nStore this securely. It can only be used once for pairing.`,
            },
          ],
        };
      }

      case "rotate": {
        if (!params.instanceId) {
          return {
            content: [{ type: "text", text: "instanceId is required." }],
          };
        }

        // Revoke old instance
        await db
          .update(pairedInstances)
          .set({ status: "revoked" })
          .where(eq(pairedInstances.id, params.instanceId));

        // Generate new key
        const newKey = `ik_${nanoid(32)}`;
        const newId = nanoid();

        await db.insert(pairedInstances).values({
          id: newId,
          instanceKeyHash: createHash("sha256").update(newKey).digest("hex"),
          wsTokenHash: null,
          origin: null,
          fingerprint: null,
          status: "pending",
          pairedAt: null,
          lastSeenAt: null,
        });

        await writeAuditLog(
          userId,
          "rotate_instance_key",
          `old=${params.instanceId} new=${newId}`,
        );

        return {
          content: [
            {
              type: "text",
              text: `Old instance revoked. New key:\n\n${newKey}\n\nThe frontend must re-pair with this key.`,
            },
          ],
        };
      }

      case "list": {
        const instances = await db.select().from(pairedInstances);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                instances.map((i) => ({
                  id: i.id,
                  status: i.status,
                  pairedAt: i.pairedAt,
                  lastSeenAt: i.lastSeenAt,
                })),
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown action: ${params.action}` }],
        };
    }
  },
};
