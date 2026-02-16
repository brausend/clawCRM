import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initDatabase, getDb } from "../db/client.js";
import { users, orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";

const TEST_DB = path.join(import.meta.dirname ?? ".", `test_${nanoid(6)}.db`);

describe("Database", () => {
  beforeAll(() => {
    initDatabase(TEST_DB);
  });

  afterAll(() => {
    try {
      fs.unlinkSync(TEST_DB);
      fs.unlinkSync(`${TEST_DB}-journal`);
      fs.unlinkSync(`${TEST_DB}-wal`);
      fs.unlinkSync(`${TEST_DB}-shm`);
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should create tables and insert a user", async () => {
    const db = getDb();
    const userId = nanoid();

    await db.insert(users).values({
      id: userId,
      displayName: "Test User",
      email: "test@example.com",
      role: "user",
      createdAt: new Date().toISOString(),
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    expect(user).toBeDefined();
    expect(user.displayName).toBe("Test User");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("user");
  });

  it("should insert and query orders", async () => {
    const db = getDb();
    const userId = nanoid();
    const orderId = nanoid();

    // Create user first (FK constraint)
    await db.insert(users).values({
      id: userId,
      displayName: "Order Test",
      role: "user",
      createdAt: new Date().toISOString(),
    });

    const now = new Date().toISOString();
    await db.insert(orders).values({
      id: orderId,
      userId,
      title: "Gas Contract Premium",
      status: "open",
      notes: "Test order",
      createdAt: now,
      updatedAt: now,
    });

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    expect(order).toBeDefined();
    expect(order.title).toBe("Gas Contract Premium");
    expect(order.status).toBe("open");
    expect(order.userId).toBe(userId);
  });
});
