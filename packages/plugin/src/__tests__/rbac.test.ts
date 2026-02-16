import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initDatabase, getDb } from "../db/client.js";
import { users, permissions, groups, groupMembers } from "../db/schema.js";
import {
  canAccess,
  grantPermission,
  isOwnData,
} from "../rbac/permission-engine.js";
import { evaluateDefaultPolicy } from "../rbac/policies.js";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";

const TEST_DB = path.join(import.meta.dirname ?? ".", `test_rbac_${nanoid(6)}.db`);

describe("RBAC Permission Engine", () => {
  let adminId: string;
  let userId: string;
  let guestId: string;

  beforeAll(async () => {
    initDatabase(TEST_DB);
    const db = getDb();
    const now = new Date().toISOString();

    adminId = nanoid();
    userId = nanoid();
    guestId = nanoid();

    await db.insert(users).values([
      { id: adminId, displayName: "Admin", role: "admin", createdAt: now },
      { id: userId, displayName: "User", role: "user", createdAt: now },
      { id: guestId, displayName: "Guest", role: "guest", createdAt: now },
    ]);
  });

  afterAll(() => {
    try {
      fs.unlinkSync(TEST_DB);
      fs.unlinkSync(`${TEST_DB}-wal`);
      fs.unlinkSync(`${TEST_DB}-shm`);
    } catch {
      // Ignore
    }
  });

  it("admin should have access to everything", async () => {
    expect(await canAccess(adminId, "orders", "*", "read")).toBe(true);
    expect(await canAccess(adminId, "admin", "*", "admin")).toBe(true);
    expect(await canAccess(adminId, "skill", "crm-sales", "execute")).toBe(true);
  });

  it("regular user should be denied by default", async () => {
    expect(await canAccess(userId, "orders", "some-order", "write")).toBe(false);
    expect(await canAccess(userId, "admin", "*", "admin")).toBe(false);
    expect(await canAccess(userId, "skill", "crm-sales", "execute")).toBe(false);
  });

  it("should grant and check permission", async () => {
    await grantPermission("user", userId, "skill", "crm-sales", "execute");
    expect(await canAccess(userId, "skill", "crm-sales", "execute")).toBe(true);
    // Other skills still denied
    expect(await canAccess(userId, "skill", "crm-admin", "execute")).toBe(false);
  });

  it("wildcard permission should grant broad access", async () => {
    await grantPermission("user", userId, "orders", "*", "read");
    expect(await canAccess(userId, "orders", "any-order-id", "read")).toBe(true);
  });

  it("isOwnData should work correctly", () => {
    expect(isOwnData("user1", "user1")).toBe(true);
    expect(isOwnData("user1", "user2")).toBe(false);
  });

  it("default policy should allow own data only", () => {
    expect(evaluateDefaultPolicy("deny-all", "u1", "u1")).toBe(true);
    expect(evaluateDefaultPolicy("deny-all", "u1", "u2")).toBe(false);
    expect(evaluateDefaultPolicy("allow-own", "u1", "u1")).toBe(true);
    expect(evaluateDefaultPolicy("allow-own", "u1", "u2")).toBe(false);
  });

  it("group permissions should be checked", async () => {
    const db = getDb();
    const groupId = nanoid();

    await db.insert(groups).values({
      id: groupId,
      name: "Sales Team",
    });

    await db.insert(groupMembers).values({
      id: nanoid(),
      groupId,
      userId: guestId,
    });

    // Grant group permission
    await grantPermission("group", groupId, "skill", "crm-support", "execute");

    // Guest should now have access via group
    expect(await canAccess(guestId, "skill", "crm-support", "execute")).toBe(true);
  });
});
