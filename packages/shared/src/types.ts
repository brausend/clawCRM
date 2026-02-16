// Core CRM entity types

export interface CrmUser {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: "admin" | "user" | "guest";
  locale: string;
  theme: "light" | "dark" | "system";
  createdAt: string;
  lastActiveAt: string | null;
}

export interface UserPreference {
  id: string;
  userId: string;
  key: string;
  value: string;
}

export interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ChannelIdentity {
  id: string;
  userId: string;
  channel: string;
  channelUserId: string;
  channelDisplayName: string | null;
  verified: boolean;
  linkedAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  sessionType: "channel" | "web";
  token: string;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface PairedInstance {
  id: string;
  origin: string | null;
  label: string | null;
  status: "active" | "revoked" | "pending";
  pairedAt: string | null;
  lastSeenAt: string | null;
}

// --- Contacts ---

export interface Contact {
  id: string;
  ownerUserId: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  notes: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

// --- Chat ---

export interface ChatMessage {
  id: string;
  userId: string;
  contactId: string | null;
  channel: string;
  channelChatId: string;
  direction: "inbound" | "outbound";
  content: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  timestamp: string;
}

// --- Orders ---

export interface Order {
  id: string;
  userId: string;
  contactId: string | null;
  title: string;
  status: "draft" | "open" | "processing" | "done" | "cancelled";
  currency: string;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  product: string;
  quantity: number;
  unitPriceCents: number;
  description: string | null;
}

// --- Projects ---

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  description: string | null;
  status: "active" | "archived" | "completed";
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: "owner" | "member" | "viewer";
}

// --- Tasks ---

export interface Task {
  id: string;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

// --- Tags ---

export interface Tag {
  id: string;
  name: string;
  color: string;
  scope: "global" | "orders" | "contacts" | "projects";
}

export interface EntityTag {
  id: string;
  tagId: string;
  entityType: "order" | "contact" | "project" | "task";
  entityId: string;
}

// --- Comments ---

export interface Comment {
  id: string;
  userId: string;
  entityType: "order" | "contact" | "project" | "task";
  entityId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// --- Attachments ---

export interface Attachment {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

// --- Notifications ---

export interface Notification {
  id: string;
  userId: string;
  type: "mention" | "assignment" | "status_change" | "comment" | "system";
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

// --- RBAC ---

export interface Permission {
  id: string;
  subjectType: "user" | "group" | "role";
  subjectId: string;
  resource: string;
  resourceId: string;
  action: "read" | "write" | "execute" | "admin";
  allowed: boolean;
}

export interface CrmGroup {
  id: string;
  name: string;
  description: string | null;
}

export interface GroupMember {
  groupId: string;
  userId: string;
}

// --- Audit ---

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  channel: string | null;
  timestamp: string;
}

// --- Modules ---

export interface InstalledModule {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
  installedAt: string;
}
