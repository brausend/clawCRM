import { Type } from "@sinclair/typebox";
import { like, or, inArray } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users, channelIdentities, orders } from "../db/schema.js";
import { getDataScope } from "../rbac/scopes.js";
import { writeAuditLog } from "../auth/auth-service.js";

export const crmListContactsTool = {
  name: "crm_list_contacts",
  description:
    "List contacts (users). Non-admin users only see users they share a project with.",
  parameters: Type.Object({
    search: Type.Optional(
      Type.String({ description: "Search by name or email" }),
    ),
  }),
  async execute(userId: string, params: { search?: string }) {
    const db = getDb();
    const scope = await getDataScope(userId, "contacts");

    let results;
    if (scope.length === 0) {
      // Admin/wildcard: see all users
      results = await db.select().from(users);
    } else {
      results = await db
        .select()
        .from(users)
        .where(inArray(users.id, scope));
    }

    // Apply text search filter
    if (params.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)),
      );
    }

    await writeAuditLog(userId, "list_contacts", `count=${results.length}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            results.map((u) => ({
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
  },
};

export const crmSearchTool = {
  name: "crm_search",
  description:
    "Search across orders, contacts, and projects. Results are scoped to user's permissions.",
  parameters: Type.Object({
    query: Type.String({ description: "Search query" }),
  }),
  async execute(userId: string, params: { query: string }) {
    const db = getDb();
    const scope = await getDataScope(userId, "orders");
    const q = params.query.toLowerCase();

    // Search orders
    let orderResults;
    if (scope.length === 0) {
      orderResults = await db.select().from(orders);
    } else {
      orderResults = await db
        .select()
        .from(orders)
        .where(inArray(orders.userId, scope));
    }
    orderResults = orderResults.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        (o.notes && o.notes.toLowerCase().includes(q)),
    );

    // Search users in scope
    const userScope = await getDataScope(userId, "contacts");
    let userResults;
    if (userScope.length === 0) {
      userResults = await db.select().from(users);
    } else {
      userResults = await db
        .select()
        .from(users)
        .where(inArray(users.id, userScope));
    }
    userResults = userResults.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)),
    );

    await writeAuditLog(userId, "search", `query=${params.query}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              orders: orderResults.slice(0, 20),
              contacts: userResults.slice(0, 20),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
};
