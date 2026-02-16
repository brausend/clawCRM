import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initDatabase, getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import {
  resolveIdentity,
  linkChannelIdentity,
  createUserWithChannel,
  getUserChannels,
} from "../auth/identity-resolver.js";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";

const TEST_DB = path.join(import.meta.dirname ?? ".", `test_identity_${nanoid(6)}.db`);

describe("Identity Resolver", () => {
  let testUserId: string;

  beforeAll(async () => {
    initDatabase(TEST_DB);
    const db = getDb();
    testUserId = nanoid();

    await db.insert(users).values({
      id: testUserId,
      displayName: "Test User",
      email: "test@example.com",
      role: "user",
      createdAt: new Date().toISOString(),
    });
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

  it("should return null for unknown channel identity", async () => {
    const result = await resolveIdentity("telegram", "unknown_123");
    expect(result).toBeNull();
  });

  it("should link and resolve a channel identity", async () => {
    await linkChannelIdentity(testUserId, "telegram", "tg_12345");

    const result = await resolveIdentity("telegram", "tg_12345");
    expect(result).toBeDefined();
    expect(result!.userId).toBe(testUserId);
    expect(result!.verified).toBe(true);
  });

  it("should create a user with channel in one step", async () => {
    const newUserId = await createUserWithChannel(
      "New User",
      "whatsapp",
      "wa_67890",
      "new@example.com",
    );

    expect(newUserId).toBeDefined();

    const identity = await resolveIdentity("whatsapp", "wa_67890");
    expect(identity).toBeDefined();
    expect(identity!.userId).toBe(newUserId);
  });

  it("should list all channels for a user", async () => {
    const channels = await getUserChannels(testUserId);
    expect(channels.length).toBe(1);
    expect(channels[0].channel).toBe("telegram");
    expect(channels[0].channelUserId).toBe("tg_12345");
  });

  it("should support multiple channels per user", async () => {
    await linkChannelIdentity(testUserId, "discord", "dc_99999");
    const channels = await getUserChannels(testUserId);
    expect(channels.length).toBe(2);
  });
});
