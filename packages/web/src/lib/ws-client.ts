import type { WsMessage } from "@clawcrm/shared";
import { useStore } from "./store.js";

declare const __VITE_WS_URL__: string | undefined;
declare const __VITE_INSTANCE_KEY__: string | undefined;

const WS_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_WS_URL ?? "ws://localhost:3848";
const INSTANCE_KEY = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_INSTANCE_KEY ?? "";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

// Pending RPC calls
const pendingRpc = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (err: Error) => void }
>();
let rpcCounter = 0;

/**
 * Connect to the ClawCRM WebSocket server.
 */
export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsToken = useStore.getState().wsToken;
  const url = wsToken ? `${WS_URL}?token=${wsToken}` : WS_URL;

  ws = new WebSocket(url);

  ws.onopen = () => {
    useStore.getState().setConnected(true);
    reconnectDelay = 1000;

    // If not paired yet, initiate pairing
    if (!wsToken && INSTANCE_KEY) {
      send({ type: "pair:init", data: { instanceKey: INSTANCE_KEY } });
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as WsMessage;
      handleMessage(msg);
    } catch {
      console.error("[ws] Failed to parse message");
    }
  };

  ws.onclose = () => {
    useStore.getState().setConnected(false);
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

/**
 * Disconnect from the WebSocket server.
 */
export function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  ws?.close();
  ws = null;
}

/**
 * Send a typed message.
 */
export function send(msg: WsMessage) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Make an RPC call and return a promise for the result.
 */
export function rpc<T = unknown>(method: string, params: unknown = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = `rpc_${++rpcCounter}`;
    pendingRpc.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    });

    send({
      type: "rpc:request",
      data: { id, method, params },
    });

    // Timeout after 30s
    setTimeout(() => {
      if (pendingRpc.has(id)) {
        pendingRpc.delete(id);
        reject(new Error("RPC timeout"));
      }
    }, 30_000);
  });
}

/**
 * Subscribe to a topic.
 */
export function subscribe(topic: string, filters?: Record<string, unknown>) {
  send({ type: "subscribe", data: { topic, filters } });
}

/**
 * Unsubscribe from a topic.
 */
export function unsubscribe(topic: string) {
  send({ type: "unsubscribe", data: { topic } });
}

/**
 * Request a passkey authentication challenge.
 */
export function requestAuthChallenge() {
  send({ type: "auth:challenge", data: { challenge: "", rpId: "" } });
}

/**
 * Send the passkey authentication response.
 */
export function sendAuthVerify(credential: unknown) {
  send({ type: "auth:verify", data: { credential } });
}

// --- Internal handlers ---

function handleMessage(msg: WsMessage) {
  const store = useStore.getState();

  switch (msg.type) {
    case "pair:success":
      store.setWsToken(msg.data.wsToken);
      break;

    case "pair:error":
      console.error("[ws] Pairing failed:", msg.data.message);
      break;

    case "auth:challenge":
      // Emitted as a custom event for the Login page to handle
      window.dispatchEvent(
        new CustomEvent("clawcrm:auth:challenge", { detail: msg.data }),
      );
      break;

    case "auth:success":
      store.setUser(msg.data.user, msg.data.token);
      localStorage.setItem("clawcrm_session", msg.data.token);
      break;

    case "auth:error":
      window.dispatchEvent(
        new CustomEvent("clawcrm:auth:error", { detail: msg.data }),
      );
      break;

    case "data":
      handleDataMessage(msg.data.topic, msg.data.payload);
      break;

    case "rpc:response": {
      const pending = pendingRpc.get(msg.data.id);
      if (pending) {
        pendingRpc.delete(msg.data.id);
        if (msg.data.error) {
          pending.reject(new Error(msg.data.error.message));
        } else {
          pending.resolve(msg.data.result);
        }
      }
      break;
    }

    case "event":
      window.dispatchEvent(
        new CustomEvent(`clawcrm:${msg.data.name}`, {
          detail: msg.data.payload,
        }),
      );
      break;
  }
}

function handleDataMessage(topic: string, payload: unknown) {
  const store = useStore.getState();

  switch (topic) {
    case "chats":
      // Append or update chat data
      if (Array.isArray(payload)) {
        store.setChats(payload);
      }
      break;
    case "orders":
      if (Array.isArray(payload)) {
        store.setOrders(payload);
      }
      break;
    case "contacts":
      if (Array.isArray(payload)) {
        store.setContacts(payload);
      }
      break;
    case "projects":
      if (Array.isArray(payload)) {
        store.setProjects(payload);
      }
      break;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30_000);
    connect();
  }, reconnectDelay);
}
