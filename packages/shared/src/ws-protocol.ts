// WebSocket protocol types for Frontend <-> Plugin communication

import type { CrmUser } from "./types.js";
import type { ErrorCode, RpcError } from "./errors.js";

// --- Setup (first run) ---

export interface SetupRequiredMessage {
  type: "setup:required";
  data: Record<string, never>;
}

export interface SetupCompleteMessage {
  type: "setup:complete";
  data: { name: string; email: string; credential: unknown };
}

// --- Instance pairing (one-time) ---

export interface PairInitMessage {
  type: "pair:init";
  data: { instanceKey: string };
}

export interface PairSuccessMessage {
  type: "pair:success";
  data: { instanceId: string; wsToken: string };
}

export interface PairErrorMessage {
  type: "pair:error";
  data: { code: ErrorCode; message: string };
}

// --- User authentication (per session) ---

export interface AuthChallengeMessage {
  type: "auth:challenge";
  data: { challenge: string; rpId: string; allowCredentials?: string[] };
}

export interface AuthVerifyMessage {
  type: "auth:verify";
  data: { credential: unknown };
}

export interface AuthSuccessMessage {
  type: "auth:success";
  data: { token: string; user: CrmUser };
}

export interface AuthErrorMessage {
  type: "auth:error";
  data: { code: ErrorCode; message: string };
}

// --- Subscriptions with cursor pagination ---

export interface SubscribeMessage {
  type: "subscribe";
  data: { topic: string; filters?: Record<string, unknown>; cursor?: string };
}

export interface UnsubscribeMessage {
  type: "unsubscribe";
  data: { topic: string };
}

export interface DataMessage {
  type: "data";
  data: {
    topic: string;
    payload: unknown;
    nextCursor?: string;
    hasMore?: boolean;
  };
}

// --- RPC with optimistic update support ---

export interface RpcRequestMessage {
  type: "rpc:request";
  data: {
    id: string;
    method: string;
    params: unknown;
    optimisticId?: string;
  };
}

export interface RpcResponseMessage {
  type: "rpc:response";
  data: {
    id: string;
    result?: unknown;
    error?: RpcError;
    optimisticId?: string;
  };
}

// --- Events ---

export interface EventMessage {
  type: "event";
  data: { name: string; payload: unknown };
}

// --- Presence ---

export interface PresenceUpdateMessage {
  type: "presence:update";
  data: { userId: string; status: "online" | "away" | "offline" };
}

export interface PresenceListMessage {
  type: "presence:list";
  data: { users: Array<{ userId: string; status: "online" | "away" | "offline" }> };
}

// --- Notifications ---

export interface NotificationMessage {
  type: "notification";
  data: {
    id: string;
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
  };
}

// Union type for all messages
export type WsMessage =
  | SetupRequiredMessage
  | SetupCompleteMessage
  | PairInitMessage
  | PairSuccessMessage
  | PairErrorMessage
  | AuthChallengeMessage
  | AuthVerifyMessage
  | AuthSuccessMessage
  | AuthErrorMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | DataMessage
  | RpcRequestMessage
  | RpcResponseMessage
  | EventMessage
  | PresenceUpdateMessage
  | PresenceListMessage
  | NotificationMessage;

// Subscription topics
export const Topics = {
  CHATS: "chats",
  ORDERS: "orders",
  PROJECTS: "projects",
  CONTACTS: "contacts",
  NOTIFICATIONS: "notifications",
  ACTIVITY: "activity",
  PRESENCE: "presence",
  ADMIN_USERS: "admin:users",
  ADMIN_PERMISSIONS: "admin:permissions",
  /** Dynamic module topic: `module:{moduleId}` */
  module: (moduleId: string) => `module:${moduleId}` as const,
} as const;

// RPC method namespaces
export const RpcMethods = {
  // Orders
  LIST_ORDERS: "crm.listOrders",
  CREATE_ORDER: "crm.createOrder",
  UPDATE_ORDER: "crm.updateOrder",
  DELETE_ORDER: "crm.deleteOrder",
  // Contacts
  LIST_CONTACTS: "crm.listContacts",
  CREATE_CONTACT: "crm.createContact",
  UPDATE_CONTACT: "crm.updateContact",
  MERGE_CONTACTS: "crm.mergeContacts",
  // Chats
  LIST_CHATS: "crm.listChats",
  GET_CHAT_MESSAGES: "crm.getChatMessages",
  MARK_CHAT_READ: "crm.markChatRead",
  // Projects + Tasks
  MANAGE_PROJECT: "crm.manageProject",
  MANAGE_TASKS: "crm.manageTasks",
  REORDER_TASKS: "crm.reorderTasks",
  // Search
  SEARCH: "crm.search",
  // Tags
  LIST_TAGS: "crm.listTags",
  CREATE_TAG: "crm.createTag",
  TAG_ENTITY: "crm.tagEntity",
  UNTAG_ENTITY: "crm.untagEntity",
  // Comments
  LIST_COMMENTS: "crm.listComments",
  CREATE_COMMENT: "crm.createComment",
  UPDATE_COMMENT: "crm.updateComment",
  DELETE_COMMENT: "crm.deleteComment",
  // Attachments
  UPLOAD_ATTACHMENT: "crm.uploadAttachment",
  DELETE_ATTACHMENT: "crm.deleteAttachment",
  // Notifications
  LIST_NOTIFICATIONS: "crm.listNotifications",
  MARK_NOTIFICATION_READ: "crm.markNotificationRead",
  MARK_ALL_READ: "crm.markAllRead",
  // Activity
  GET_ACTIVITY: "crm.getActivity",
  // Export + Bulk
  EXPORT: "crm.export",
  BULK_UPDATE: "crm.bulkUpdate",
  // User preferences + passkeys
  GET_PREFERENCES: "crm.user.getPreferences",
  SET_PREFERENCE: "crm.user.setPreference",
  LIST_PASSKEYS: "crm.user.listPasskeys",
  DELETE_PASSKEY: "crm.user.deletePasskey",
  REGISTER_PASSKEY: "crm.user.registerPasskey",
  // Admin
  ADMIN_USERS: "crm.admin.users",
  ADMIN_PERMISSIONS: "crm.admin.permissions",
  ADMIN_MODULES: "crm.admin.modules",
  ADMIN_GENERATE_INSTANCE_KEY: "crm.admin.generateInstanceKey",
  ADMIN_ROTATE_INSTANCE_KEY: "crm.admin.rotateInstanceKey",
  ADMIN_GET_STATS: "crm.admin.getStats",
} as const;
