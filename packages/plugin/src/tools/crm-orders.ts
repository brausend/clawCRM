import { Type } from "@sinclair/typebox";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { orders } from "../db/schema.js";
import { canAccess, isOwnData } from "../rbac/permission-engine.js";
import { getDataScope } from "../rbac/scopes.js";
import { writeAuditLog } from "../auth/auth-service.js";

export const crmListOrdersTool = {
  name: "crm_list_orders",
  description: "List orders. Non-admin users only see their own orders.",
  parameters: Type.Object({
    status: Type.Optional(
      Type.String({ description: "Filter by status: open, processing, done, cancelled" }),
    ),
  }),
  async execute(userId: string, params: { status?: string }) {
    const db = getDb();
    const scope = await getDataScope(userId, "orders");

    let query = db.select().from(orders);

    // Scope filter: empty array = no filter (admin/wildcard)
    if (scope.length > 0) {
      query = query.where(inArray(orders.userId, scope)) as typeof query;
    }

    if (params.status) {
      const s = params.status as "draft" | "open" | "processing" | "done" | "cancelled";
      query = query.where(eq(orders.status, s)) as typeof query;
    }

    const filtered = await query;

    await writeAuditLog(userId, "list_orders", `count=${filtered.length}`);

    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
    };
  },
};

export const crmCreateOrderTool = {
  name: "crm_create_order",
  description: "Create a new order for the current user.",
  parameters: Type.Object({
    title: Type.String({ description: "Order title" }),
    notes: Type.Optional(Type.String({ description: "Additional notes" })),
    currency: Type.Optional(Type.String({ description: "Currency code (default EUR)" })),
    totalCents: Type.Optional(Type.Number({ description: "Total amount in cents" })),
  }),
  async execute(userId: string, params: { title: string; notes?: string; currency?: string; totalCents?: number }) {
    const db = getDb();
    const id = nanoid();
    const now = new Date().toISOString();

    await db.insert(orders).values({
      id,
      userId,
      title: params.title,
      status: "open",
      currency: params.currency ?? "EUR",
      totalCents: params.totalCents ?? 0,
      notes: params.notes ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog(userId, "create_order", `orderId=${id}`);

    return {
      content: [
        {
          type: "text",
          text: `Order created: ${id} "${params.title}"`,
        },
      ],
    };
  },
};

export const crmUpdateOrderTool = {
  name: "crm_update_order",
  description: "Update an existing order. Users can only update their own orders.",
  parameters: Type.Object({
    orderId: Type.String({ description: "Order ID to update" }),
    status: Type.Optional(
      Type.String({ description: "New status: open, processing, done, cancelled" }),
    ),
    notes: Type.Optional(Type.String({ description: "Updated notes" })),
  }),
  async execute(
    userId: string,
    params: { orderId: string; status?: string; notes?: string },
  ) {
    const db = getDb();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, params.orderId))
      .limit(1);

    if (!order) {
      return { content: [{ type: "text", text: "Order not found." }] };
    }

    // Check ownership or admin access
    if (!isOwnData(userId, order.userId)) {
      const hasAccess = await canAccess(userId, "orders", params.orderId, "write");
      if (!hasAccess) {
        return {
          content: [{ type: "text", text: "Permission denied. Not your order." }],
        };
      }
    }

    const updates: Record<string, unknown> = {};
    if (params.status) updates.status = params.status;
    if (params.notes !== undefined) updates.notes = params.notes;

    if (Object.keys(updates).length > 0) {
      await db.update(orders).set(updates).where(eq(orders.id, params.orderId));
    }

    await writeAuditLog(userId, "update_order", `orderId=${params.orderId}`);

    return {
      content: [{ type: "text", text: `Order ${params.orderId} updated.` }],
    };
  },
};
