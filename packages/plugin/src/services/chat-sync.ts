import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { chatMessages } from "../db/schema.js";
import { broadcastToTopic } from "./websocket-server.js";

/**
 * Store a chat message and broadcast it to subscribed dashboard clients.
 */
export async function syncChatMessage(
  userId: string,
  channel: string,
  channelChatId: string,
  direction: "inbound" | "outbound",
  content: string,
  metadata?: Record<string, unknown>,
  contactId?: string,
): Promise<string> {
  const db = getDb();
  const id = nanoid();
  const timestamp = new Date().toISOString();

  await db.insert(chatMessages).values({
    id,
    userId,
    contactId: contactId ?? null,
    channel,
    channelChatId,
    direction,
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
    isRead: direction === "outbound",
    timestamp,
  });

  // Broadcast to user's dashboard if subscribed
  broadcastToTopic(
    "chats",
    {
      id,
      userId,
      channel,
      channelChatId,
      direction,
      content,
      timestamp,
    },
    userId,
  );

  return id;
}
