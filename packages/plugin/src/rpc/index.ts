import { eq, inArray, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import {
  orders,
  chatMessages,
  users,
  projects,
  projectMembers,
  tasks,
  permissions,
  pairedInstances,
} from "../db/schema.js";
import { canAccess, isOwnData } from "../rbac/permission-engine.js";
import { getDataScope, getAccessibleProjectIds } from "../rbac/scopes.js";
import { writeAuditLog } from "../auth/auth-service.js";
import { RpcMethods } from "@clawcrm/shared";

type RpcHandler = (userId: string, params: unknown) => Promise<unknown>;

/**
 * All RPC handlers mapped by method name.
 * These serve the WebSocket frontend via rpc:request messages.
 */
export const rpcHandlers: Record<string, RpcHandler> = {
  [RpcMethods.LIST_ORDERS]: async (userId, params) => {
    const db = getDb();
    const scope = await getDataScope(userId, "orders");
    const p = params as { status?: string } | undefined;

    let results;
    if (scope.length === 0) {
      results = await db.select().from(orders);
    } else {
      results = await db.select().from(orders).where(inArray(orders.userId, scope));
    }

    if (p?.status) {
      results = results.filter((o) => o.status === p.status);
    }
    return results;
  },

  [RpcMethods.CREATE_ORDER]: async (userId, params) => {
    const db = getDb();
    const p = params as { title: string; notes?: string; currency?: string; totalCents?: number };
    const id = nanoid();
    const now = new Date().toISOString();

    await db.insert(orders).values({
      id,
      userId,
      title: p.title,
      status: "open",
      currency: p.currency ?? "EUR",
      totalCents: p.totalCents ?? 0,
      notes: p.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(userId, "create_order", `orderId=${id}`);
    return { id, title: p.title, status: "open" };
  },

  [RpcMethods.UPDATE_ORDER]: async (userId, params) => {
    const db = getDb();
    const p = params as { orderId: string; status?: string; notes?: string };

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, p.orderId))
      .limit(1);

    if (!order) throw new Error("Order not found");
    if (!isOwnData(userId, order.userId)) {
      const hasAccess = await canAccess(userId, "orders", p.orderId, "write");
      if (!hasAccess) throw new Error("Permission denied");
    }

    const updates: Record<string, unknown> = {};
    if (p.status) updates.status = p.status;
    if (p.notes !== undefined) updates.notes = p.notes;

    await db.update(orders).set(updates).where(eq(orders.id, p.orderId));
    await writeAuditLog(userId, "update_order", `orderId=${p.orderId}`);
    return { updated: true };
  },

  [RpcMethods.LIST_CHATS]: async (userId) => {
    const db = getDb();
    // Get distinct chat threads for this user
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.timestamp));

    // Group by channelChatId to form threads
    const threads = new Map<string, { channel: string; lastMessage: string; timestamp: string; count: number }>();
    for (const msg of messages) {
      const existing = threads.get(msg.channelChatId);
      if (!existing) {
        threads.set(msg.channelChatId, {
          channel: msg.channel,
          lastMessage: msg.content.slice(0, 100),
          timestamp: msg.timestamp,
          count: 1,
        });
      } else {
        existing.count++;
      }
    }

    return Array.from(threads.entries()).map(([chatId, data]) => ({
      chatId,
      ...data,
    }));
  },

  [RpcMethods.GET_CHAT_MESSAGES]: async (userId, params) => {
    const db = getDb();
    const p = params as { chatId: string; limit?: number };

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.channelChatId, p.chatId))
      .orderBy(desc(chatMessages.timestamp));

    // Verify user owns these messages
    if (messages.length > 0 && messages[0].userId !== userId) {
      const hasAccess = await canAccess(userId, "data_scope", "*", "read");
      if (!hasAccess) throw new Error("Permission denied");
    }

    return messages.slice(0, p.limit ?? 50);
  },

  [RpcMethods.LIST_CONTACTS]: async (userId, params) => {
    const db = getDb();
    const scope = await getDataScope(userId, "contacts");
    const p = params as { search?: string } | undefined;

    let results;
    if (scope.length === 0) {
      results = await db.select().from(users);
    } else {
      results = await db.select().from(users).where(inArray(users.id, scope));
    }

    if (p?.search) {
      const q = p.search.toLowerCase();
      results = results.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)),
      );
    }

    return results.map((u) => ({
      id: u.id,
      name: u.displayName,
      email: u.email,
      role: u.role,
    }));
  },

  [RpcMethods.SEARCH]: async (userId, params) => {
    const p = params as { query: string };
    const q = p.query.toLowerCase();
    const db = getDb();

    const scope = await getDataScope(userId, "orders");
    let orderResults;
    if (scope.length === 0) {
      orderResults = await db.select().from(orders);
    } else {
      orderResults = await db.select().from(orders).where(inArray(orders.userId, scope));
    }
    orderResults = orderResults.filter(
      (o) => o.title.toLowerCase().includes(q) || (o.notes && o.notes.toLowerCase().includes(q)),
    );

    return { orders: orderResults.slice(0, 20) };
  },

  [RpcMethods.MANAGE_PROJECT]: async (userId, params) => {
    const p = params as { action: string; [key: string]: unknown };
    const db = getDb();

    if (p.action === "list") {
      const hasWildcard = await canAccess(userId, "project", "*", "read");
      if (hasWildcard) return db.select().from(projects);
      const ids = await getAccessibleProjectIds(userId);
      if (ids.length === 0) return [];
      return db.select().from(projects).where(inArray(projects.id, ids));
    }
    throw new Error(`Use agent tools for project mutation: ${p.action}`);
  },

  [RpcMethods.MANAGE_TASKS]: async (userId, params) => {
    const p = params as { projectId: string };
    const db = getDb();
    const ids = await getAccessibleProjectIds(userId);
    const hasWildcard = await canAccess(userId, "project", "*", "read");

    if (!hasWildcard && !ids.includes(p.projectId)) {
      throw new Error("Permission denied");
    }

    return db.select().from(tasks).where(eq(tasks.projectId, p.projectId));
  },

  [RpcMethods.ADMIN_USERS]: async (userId) => {
    const isAdmin = await canAccess(userId, "admin", "*", "admin");
    if (!isAdmin) throw new Error("Admin access required");
    const db = getDb();
    return db.select().from(users);
  },

  [RpcMethods.ADMIN_PERMISSIONS]: async (userId) => {
    const isAdmin = await canAccess(userId, "admin", "*", "admin");
    if (!isAdmin) throw new Error("Admin access required");
    const db = getDb();
    return db.select().from(permissions);
  },

  [RpcMethods.ADMIN_MODULES]: async (userId) => {
    const isAdmin = await canAccess(userId, "admin", "*", "admin");
    if (!isAdmin) throw new Error("Admin access required");
    const { getInstalledModules } = await import("../modules/registry.js");
    return getInstalledModules();
  },
};
