import { Type } from "@sinclair/typebox";
import { eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { projects, projectMembers, tasks } from "../db/schema.js";
import { getAccessibleProjectIds } from "../rbac/scopes.js";
import { canAccess } from "../rbac/permission-engine.js";
import { writeAuditLog } from "../auth/auth-service.js";

export const crmManageProjectTool = {
  name: "crm_manage_project",
  description:
    "Create, list, or update projects. Users only see projects they are a member of.",
  parameters: Type.Object({
    action: Type.String({
      description: "Action: list, create, update, addMember",
    }),
    projectId: Type.Optional(Type.String()),
    name: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    memberId: Type.Optional(Type.String({ description: "User ID to add as member" })),
    memberRole: Type.Optional(
      Type.String({ description: "Role for new member: member, viewer" }),
    ),
  }),
  async execute(
    userId: string,
    params: {
      action: string;
      projectId?: string;
      name?: string;
      description?: string;
      memberId?: string;
      memberRole?: string;
    },
  ) {
    const db = getDb();

    switch (params.action) {
      case "list": {
        // Check for admin wildcard access
        const hasWildcard = await canAccess(userId, "project", "*", "read");
        let results;

        if (hasWildcard) {
          results = await db.select().from(projects);
        } else {
          const accessibleIds = await getAccessibleProjectIds(userId);
          if (accessibleIds.length === 0) {
            return { content: [{ type: "text", text: "No projects found." }] };
          }
          results = await db
            .select()
            .from(projects)
            .where(inArray(projects.id, accessibleIds));
        }

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "create": {
        if (!params.name) {
          return { content: [{ type: "text", text: "Name is required." }] };
        }
        const id = nanoid();
        const now = new Date().toISOString();

        await db.insert(projects).values({
          id,
          name: params.name,
          ownerId: userId,
          description: params.description ?? null,
          createdAt: now,
          updatedAt: now,
        });

        // Add creator as owner member
        await db.insert(projectMembers).values({
          id: nanoid(),
          projectId: id,
          userId,
          role: "owner",
        });

        await writeAuditLog(userId, "create_project", `projectId=${id}`);
        return {
          content: [
            { type: "text", text: `Project "${params.name}" created (${id}).` },
          ],
        };
      }

      case "addMember": {
        if (!params.projectId || !params.memberId) {
          return {
            content: [
              { type: "text", text: "projectId and memberId are required." },
            ],
          };
        }

        // Verify the user is an owner of the project
        const accessibleIds = await getAccessibleProjectIds(userId);
        if (!accessibleIds.includes(params.projectId)) {
          const hasAdmin = await canAccess(userId, "project", params.projectId, "admin");
          if (!hasAdmin) {
            return { content: [{ type: "text", text: "Permission denied." }] };
          }
        }

        await db.insert(projectMembers).values({
          id: nanoid(),
          projectId: params.projectId,
          userId: params.memberId,
          role: (params.memberRole as "member" | "viewer") ?? "member",
        });

        await writeAuditLog(
          userId,
          "add_project_member",
          `project=${params.projectId} member=${params.memberId}`,
        );
        return {
          content: [{ type: "text", text: "Member added to project." }],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown action: ${params.action}. Use list, create, or addMember.`,
            },
          ],
        };
    }
  },
};

export const crmManageTasksTool = {
  name: "crm_manage_tasks",
  description:
    "Create, list, or update tasks within a project. Scoped to accessible projects.",
  parameters: Type.Object({
    action: Type.String({ description: "Action: list, create, update" }),
    projectId: Type.String({ description: "Project ID" }),
    taskId: Type.Optional(Type.String()),
    title: Type.Optional(Type.String()),
    status: Type.Optional(Type.String()),
    assigneeId: Type.Optional(Type.String()),
    dueDate: Type.Optional(Type.String()),
  }),
  async execute(
    userId: string,
    params: {
      action: string;
      projectId: string;
      taskId?: string;
      title?: string;
      status?: string;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    const db = getDb();

    // Verify project access
    const accessibleIds = await getAccessibleProjectIds(userId);
    const hasWildcard = await canAccess(userId, "project", "*", "read");
    if (!hasWildcard && !accessibleIds.includes(params.projectId)) {
      return { content: [{ type: "text", text: "Permission denied." }] };
    }

    switch (params.action) {
      case "list": {
        const results = await db
          .select()
          .from(tasks)
          .where(eq(tasks.projectId, params.projectId));
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      case "create": {
        if (!params.title) {
          return { content: [{ type: "text", text: "Title is required." }] };
        }
        const id = nanoid();
        const validStatus = (params.status ?? "todo") as "todo" | "in_progress" | "review" | "done";
        await db.insert(tasks).values({
          id,
          projectId: params.projectId,
          assigneeId: params.assigneeId ?? null,
          title: params.title,
          status: validStatus,
          dueDate: params.dueDate ?? null,
          createdAt: new Date().toISOString(),
        });

        await writeAuditLog(userId, "create_task", `taskId=${id}`);
        return {
          content: [{ type: "text", text: `Task "${params.title}" created (${id}).` }],
        };
      }

      case "update": {
        if (!params.taskId) {
          return { content: [{ type: "text", text: "taskId is required." }] };
        }
        const updates: Record<string, unknown> = {};
        if (params.status) updates.status = params.status;
        if (params.assigneeId) updates.assigneeId = params.assigneeId;
        if (params.title) updates.title = params.title;
        if (params.dueDate) updates.dueDate = params.dueDate;

        await db.update(tasks).set(updates).where(eq(tasks.id, params.taskId));
        await writeAuditLog(userId, "update_task", `taskId=${params.taskId}`);
        return {
          content: [{ type: "text", text: `Task ${params.taskId} updated.` }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown action: ${params.action}` }],
        };
    }
  },
};
