import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let rawSqlite: Database.Database | null = null;

/** Initialize the database connection and create tables if needed. */
export function initDatabase(dbPath: string) {
  rawSqlite = new Database(dbPath);
  rawSqlite.pragma("journal_mode = WAL");
  rawSqlite.pragma("foreign_keys = ON");
  db = drizzle(rawSqlite, { schema });
  runMigrations();
  return db;
}

/** Get the active database instance. */
export function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDatabase first.");
  return db;
}

/** Get the raw SQLite instance for direct queries. */
export function getRawDb(): Database.Database {
  if (!rawSqlite) throw new Error("Database not initialized.");
  return rawSqlite;
}

export type AppDatabase = NonNullable<typeof db>;

/** Create all tables if they don't exist yet (idempotent). */
function runMigrations() {
  const sqlite = rawSqlite!;

  sqlite.exec(`
    -- Users with locale, theme, avatar support
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      locale TEXT NOT NULL DEFAULT 'de',
      theme TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL,
      last_active_at TEXT
    );

    -- Per-user key-value preferences
    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      value TEXT NOT NULL
    );

    -- WebAuthn passkey credentials
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      credential_id TEXT NOT NULL UNIQUE,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      device_name TEXT,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );

    -- Channel identity mappings (telegram, whatsapp, etc.)
    CREATE TABLE IF NOT EXISTS channel_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      channel TEXT NOT NULL,
      channel_user_id TEXT NOT NULL,
      channel_display_name TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      linked_at TEXT NOT NULL
    );

    -- Auth sessions (channel + web)
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      session_type TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Paired frontend instances
    CREATE TABLE IF NOT EXISTS paired_instances (
      id TEXT PRIMARY KEY,
      instance_key_hash TEXT NOT NULL,
      ws_token_hash TEXT,
      origin TEXT,
      fingerprint TEXT,
      label TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      paired_at TEXT,
      last_seen_at TEXT
    );

    -- Contacts (owned by a user)
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      position TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Chat messages with optional contact link and read status
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      contact_id TEXT REFERENCES contacts(id),
      channel TEXT NOT NULL,
      channel_chat_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL
    );

    -- Orders with title, currency, total, and optional contact link
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      contact_id TEXT REFERENCES contacts(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      currency TEXT NOT NULL DEFAULT 'EUR',
      total_cents INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Order line items
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      product TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      description TEXT
    );

    -- Projects with status and color
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL REFERENCES users(id),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      color TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member'
    );

    -- Tasks with priority, sort order, description
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      assignee_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      sort_order INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    -- Tags (colored labels)
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      scope TEXT NOT NULL DEFAULT 'global'
    );

    -- Polymorphic entity-tag junction
    CREATE TABLE IF NOT EXISTS entity_tags (
      id TEXT PRIMARY KEY,
      tag_id TEXT NOT NULL REFERENCES tags(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL
    );

    -- Comments on entities
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- File attachments on entities
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- In-app notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      entity_type TEXT,
      entity_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- RBAC permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      action TEXT NOT NULL,
      allowed INTEGER NOT NULL DEFAULT 1
    );

    -- User groups
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      user_id TEXT NOT NULL REFERENCES users(id)
    );

    -- Installed CRM modules
    CREATE TABLE IF NOT EXISTS crm_modules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      config TEXT,
      installed_at TEXT NOT NULL
    );

    -- Generic module data storage
    CREATE TABLE IF NOT EXISTS module_data (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES crm_modules(id),
      user_id TEXT REFERENCES users(id),
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Audit log with entity tracking
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      channel TEXT,
      timestamp TEXT NOT NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user
      ON user_preferences(user_id, key);
    CREATE INDEX IF NOT EXISTS idx_channel_identities_lookup
      ON channel_identities(channel, channel_user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user
      ON chat_messages(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_contact
      ON chat_messages(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_owner
      ON contacts(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user
      ON orders(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_contact
      ON orders(contact_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order
      ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project
      ON tasks(project_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee
      ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_entity_tags_entity
      ON entity_tags(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_tags_tag
      ON entity_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_comments_entity
      ON comments(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_attachments_entity
      ON attachments(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON notifications(user_id, is_read, created_at);
    CREATE INDEX IF NOT EXISTS idx_permissions_subject
      ON permissions(subject_type, subject_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_user
      ON audit_log(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity
      ON audit_log(entity_type, entity_id);
  `);

  // FTS5 full-text search index (contentless)
  try {
    sqlite.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_index USING fts5(
        entity_type, entity_id, content,
        content='', contentless_delete=1
      );
    `);
  } catch {
    // FTS5 already exists or not supported
  }
}
