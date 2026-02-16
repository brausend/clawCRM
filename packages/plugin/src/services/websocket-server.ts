import { WebSocketServer, WebSocket } from "ws";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { pairedInstances } from "../db/schema.js";
import { validateSession } from "../auth/auth-service.js";
import { startAuthentication, finishAuthentication } from "../auth/passkey.js";
import { createSession } from "../auth/auth-service.js";
import { canAccess } from "../rbac/permission-engine.js";
import type { WsMessage, CrmUser } from "@clawcrm/shared";
import { ErrorCodes } from "@clawcrm/shared";

interface ClientState {
  ws: WebSocket;
  instanceId: string | null;
  userId: string | null;
  user: CrmUser | null;
  subscriptions: Set<string>;
  challengeKey: string | null;
}

// Active connections
const clients = new Map<WebSocket, ClientState>();

// RPC handlers registered by tools/modules
type RpcHandler = (userId: string, params: unknown) => Promise<unknown>;
const rpcHandlers = new Map<string, RpcHandler>();

let wss: WebSocketServer | null = null;

/**
 * Start the WebSocket server for frontend connections.
 */
export function startWsServer(port: number, allowedOrigins: string[]) {
  wss = new WebSocketServer({ port });

  wss.on("connection", (ws, req) => {
    const origin = req.headers.origin ?? "";

    // Check origin if configured
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      ws.close(4403, "Origin not allowed");
      return;
    }

    const state: ClientState = {
      ws,
      instanceId: null,
      userId: null,
      user: null,
      subscriptions: new Set(),
      challengeKey: null,
    };
    clients.set(ws, state);

    // Check for wsToken in URL params (reconnect)
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const wsToken = url.searchParams.get("token");
    if (wsToken) {
      handleReconnect(state, wsToken);
    }

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsMessage;
        handleMessage(state, msg);
      } catch {
        send(ws, { type: "auth:error", data: { code: ErrorCodes.VALIDATION_ERROR, message: "Invalid message format" } });
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  return wss;
}

/**
 * Stop the WebSocket server.
 */
export function stopWsServer() {
  if (wss) {
    for (const [ws] of clients) {
      ws.close(1001, "Server shutting down");
    }
    clients.clear();
    wss.close();
    wss = null;
  }
}

/**
 * Register an RPC handler for a specific method.
 */
export function registerRpcHandler(method: string, handler: RpcHandler) {
  rpcHandlers.set(method, handler);
}

/**
 * Broadcast a data message to all subscribed clients.
 */
export function broadcastToTopic(topic: string, payload: unknown, filterUserId?: string) {
  for (const [ws, state] of clients) {
    if (!state.subscriptions.has(topic)) continue;
    if (filterUserId && state.userId !== filterUserId) continue;
    send(ws, { type: "data", data: { topic, payload } });
  }
}

/**
 * Send an event to a specific user across all their connections.
 */
export function sendToUser(userId: string, event: string, payload: unknown) {
  for (const [ws, state] of clients) {
    if (state.userId !== userId) continue;
    send(ws, { type: "event", data: { name: event, payload } });
  }
}

// --- Internal message handling ---

async function handleMessage(state: ClientState, msg: WsMessage) {
  switch (msg.type) {
    case "pair:init":
      await handlePairInit(state, msg.data.instanceKey);
      break;
    case "auth:verify":
      await handleAuthVerify(state, msg.data.credential);
      break;
    case "subscribe":
      await handleSubscribe(state, msg.data.topic, msg.data.filters);
      break;
    case "unsubscribe":
      state.subscriptions.delete(msg.data.topic);
      break;
    case "rpc:request":
      await handleRpc(state, msg.data.id, msg.data.method, msg.data.params);
      break;
    default:
      // Request auth challenge (when client sends auth:challenge with empty data)
      if ((msg as WsMessage).type === "auth:challenge") {
        await handleAuthChallenge(state);
      }
  }
}

async function handleReconnect(state: ClientState, wsToken: string) {
  const db = getDb();
  const hash = hashToken(wsToken);
  const [instance] = await db
    .select()
    .from(pairedInstances)
    .where(
      and(
        eq(pairedInstances.wsTokenHash, hash),
        eq(pairedInstances.status, "active"),
      ),
    )
    .limit(1);

  if (instance) {
    state.instanceId = instance.id;
    await db
      .update(pairedInstances)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(pairedInstances.id, instance.id));
  } else {
    send(state.ws, { type: "pair:error", data: { code: ErrorCodes.PAIRING_INVALID, message: "Invalid or revoked token" } });
    state.ws.close(4401, "Invalid token");
  }
}

async function handlePairInit(state: ClientState, instanceKey: string) {
  const db = getDb();
  const keyHash = hashToken(instanceKey);

  const [instance] = await db
    .select()
    .from(pairedInstances)
    .where(
      and(
        eq(pairedInstances.instanceKeyHash, keyHash),
        eq(pairedInstances.status, "pending"),
      ),
    )
    .limit(1);

  if (!instance) {
    send(state.ws, { type: "pair:error", data: { code: ErrorCodes.PAIRING_INVALID, message: "Invalid or already used instance key" } });
    return;
  }

  // Generate wsToken and mark as paired
  const wsToken = nanoid(64);
  const now = new Date().toISOString();

  await db
    .update(pairedInstances)
    .set({
      wsTokenHash: hashToken(wsToken),
      status: "active",
      pairedAt: now,
      lastSeenAt: now,
    })
    .where(eq(pairedInstances.id, instance.id));

  state.instanceId = instance.id;
  send(state.ws, {
    type: "pair:success",
    data: { instanceId: instance.id, wsToken },
  });
}

async function handleAuthChallenge(state: ClientState) {
  const { options, challengeKey } = await startAuthentication();
  state.challengeKey = challengeKey;
  send(state.ws, {
    type: "auth:challenge",
    data: {
      challenge: JSON.stringify(options),
      rpId: (options as unknown as { rpID?: string }).rpID ?? "localhost",
    },
  });
}

async function handleAuthVerify(state: ClientState, credential: unknown) {
  if (!state.challengeKey) {
    send(state.ws, { type: "auth:error", data: { code: ErrorCodes.UNAUTHORIZED, message: "No challenge pending" } });
    return;
  }

  try {
    const result = await finishAuthentication(state.challengeKey, credential);
    const token = await createSession(result.userId, "web");
    const user = await validateSession(token);
    if (!user) throw new Error("Session creation failed");

    state.userId = user.id;
    state.user = user;
    state.challengeKey = null;

    send(state.ws, { type: "auth:success", data: { token, user } });
  } catch (err) {
    send(state.ws, {
      type: "auth:error",
      data: { code: ErrorCodes.UNAUTHORIZED, message: err instanceof Error ? err.message : "Authentication failed" },
    });
  }
}

async function handleSubscribe(
  state: ClientState,
  topic: string,
  _filters?: Record<string, unknown>,
) {
  if (!state.userId) {
    send(state.ws, { type: "auth:error", data: { code: ErrorCodes.UNAUTHORIZED, message: "Not authenticated" } });
    return;
  }

  // Check admin topics
  if (topic.startsWith("admin:")) {
    const hasAccess = await canAccess(state.userId, "admin", "*", "read");
    if (!hasAccess) {
      send(state.ws, {
        type: "rpc:response",
        data: { id: "", error: { code: ErrorCodes.FORBIDDEN, message: "Insufficient permissions for admin topic" } },
      });
      return;
    }
  }

  // Check module topics
  if (topic.startsWith("module:")) {
    const moduleId = topic.replace("module:", "");
    const hasAccess = await canAccess(state.userId, "module", moduleId, "read");
    if (!hasAccess) {
      send(state.ws, {
        type: "rpc:response",
        data: { id: "", error: { code: ErrorCodes.FORBIDDEN, message: `No access to module: ${moduleId}` } },
      });
      return;
    }
  }

  state.subscriptions.add(topic);
}

async function handleRpc(
  state: ClientState,
  id: string,
  method: string,
  params: unknown,
) {
  if (!state.userId) {
    send(state.ws, {
      type: "rpc:response",
      data: { id, error: { code: ErrorCodes.UNAUTHORIZED, message: "Not authenticated" } },
    });
    return;
  }

  const handler = rpcHandlers.get(method);
  if (!handler) {
    send(state.ws, {
      type: "rpc:response",
      data: { id, error: { code: ErrorCodes.NOT_FOUND, message: `Unknown method: ${method}` } },
    });
    return;
  }

  try {
    const result = await handler(state.userId, params);
    send(state.ws, { type: "rpc:response", data: { id, result } });
  } catch (err) {
    send(state.ws, {
      type: "rpc:response",
      data: { id, error: { code: ErrorCodes.INTERNAL_ERROR, message: err instanceof Error ? err.message : "Internal error" } },
    });
  }
}

// --- Helpers ---

function send(ws: WebSocket, msg: WsMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
