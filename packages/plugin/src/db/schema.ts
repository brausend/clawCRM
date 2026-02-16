import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// --- Users ---

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["admin", "user", "guest"] })
    .notNull()
    .default("user"),
  locale: text("locale").notNull().default("de"),
  theme: text("theme", { enum: ["light", "dark", "system"] })
    .notNull()
    .default("system"),
  createdAt: text("created_at").notNull(),
  lastActiveAt: text("last_active_at"),
});

// --- User preferences (key-value per user) ---

export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

// --- Passkey credentials ---

export const passkeyCredentials = sqliteTable("passkey_credentials", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transports: text("transports"), // JSON array of transport strings
  deviceName: text("device_name"),
  createdAt: text("created_at").notNull(),
  lastUsedAt: text("last_used_at"),
});

// --- Channel identities ---

export const channelIdentities = sqliteTable("channel_identities", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  channel: text("channel").notNull(),
  channelUserId: text("channel_user_id").notNull(),
  channelDisplayName: text("channel_display_name"),
  verified: integer("verified", { mode: "boolean" }).notNull().default(false),
  linkedAt: text("linked_at").notNull(),
});

// --- Auth sessions ---

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  sessionType: text("session_type", { enum: ["channel", "web"] }).notNull(),
  token: text("token").notNull().unique(),
  userAgent: text("user_agent"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// --- Paired frontend instances ---

export const pairedInstances = sqliteTable("paired_instances", {
  id: text("id").primaryKey(),
  instanceKeyHash: text("instance_key_hash").notNull(),
  wsTokenHash: text("ws_token_hash"),
  origin: text("origin"),
  fingerprint: text("fingerprint"),
  label: text("label"),
  status: text("status", { enum: ["active", "revoked", "pending"] })
    .notNull()
    .default("pending"),
  pairedAt: text("paired_at"),
  lastSeenAt: text("last_seen_at"),
});

// --- Contacts ---

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  position: text("position"),
  notes: text("notes"),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Chat messages ---

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  contactId: text("contact_id").references(() => contacts.id),
  channel: text("channel").notNull(),
  channelChatId: text("channel_chat_id").notNull(),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  timestamp: text("timestamp").notNull(),
});

// --- Orders ---

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  contactId: text("contact_id").references(() => contacts.id),
  title: text("title").notNull(),
  status: text("status", {
    enum: ["draft", "open", "processing", "done", "cancelled"],
  })
    .notNull()
    .default("open"),
  currency: text("currency").notNull().default("EUR"),
  totalCents: integer("total_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Order items (line items per order) ---

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  product: text("product").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  description: text("description"),
});

// --- Projects ---

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  description: text("description"),
  status: text("status", { enum: ["active", "archived", "completed"] })
    .notNull()
    .default("active"),
  color: text("color"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projectMembers = sqliteTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role", { enum: ["owner", "member", "viewer"] })
    .notNull()
    .default("member"),
});

// --- Tasks ---

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  assigneeId: text("assignee_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["todo", "in_progress", "review", "done"],
  })
    .notNull()
    .default("todo"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"],
  })
    .notNull()
    .default("medium"),
  sortOrder: integer("sort_order").notNull().default(0),
  dueDate: text("due_date"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull(),
});

// --- Tags ---

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  scope: text("scope", {
    enum: ["global", "orders", "contacts", "projects"],
  })
    .notNull()
    .default("global"),
});

export const entityTags = sqliteTable("entity_tags", {
  id: text("id").primaryKey(),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id),
  entityType: text("entity_type").notNull(), // order | contact | project | task
  entityId: text("entity_id").notNull(),
});

// --- Comments ---

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  entityType: text("entity_type").notNull(), // order | contact | project | task
  entityId: text("entity_id").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Attachments ---

export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  entityType: text("entity_type").notNull(), // order | contact | project | task | comment
  entityId: text("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  createdAt: text("created_at").notNull(),
});

// --- Notifications ---

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type", {
    enum: ["mention", "assignment", "status_change", "comment", "system"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

// --- Permissions ---

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type", {
    enum: ["user", "group", "role"],
  }).notNull(),
  subjectId: text("subject_id").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id").notNull(),
  action: text("action", {
    enum: ["read", "write", "execute", "admin"],
  }).notNull(),
  allowed: integer("allowed", { mode: "boolean" }).notNull().default(true),
});

// --- Groups ---

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const groupMembers = sqliteTable("group_members", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
});

// --- CRM modules ---

export const crmModules = sqliteTable("crm_modules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  config: text("config"), // JSON
  installedAt: text("installed_at").notNull(),
});

// --- Module data (generic key-value storage for modules) ---

export const moduleData = sqliteTable("module_data", {
  id: text("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => crmModules.id),
  userId: text("user_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  data: text("data").notNull(), // JSON
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// --- Audit log ---

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  details: text("details"),
  channel: text("channel"),
  timestamp: text("timestamp").notNull(),
});
