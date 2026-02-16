// CRM module interface for extensibility

/**
 * Tool definition that a module can register as an OpenClaw agent tool.
 */
export interface ModuleToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (userId: string, params: unknown, ctx: ModuleContext) => Promise<unknown>;
}

/**
 * RPC method definition exposed via WebSocket.
 */
export interface ModuleRpcDefinition {
  name: string;
  handler: (userId: string, params: unknown, ctx: ModuleContext) => Promise<unknown>;
}

/**
 * Context provided to module operations at runtime.
 */
export interface ModuleContext {
  /** Database client scoped to this module's tables */
  db: unknown;
  /** Logger */
  log: (msg: string) => void;
}

/**
 * Frontend UI component descriptors for dashboard rendering.
 * Stored as import paths; the frontend lazy-loads these.
 */
export interface ModuleUiDescriptor {
  listView?: string;
  detailView?: string;
  dashboardWidget?: string;
  adminView?: string;
}

/**
 * Main interface every CRM module must implement.
 */
export interface CrmModule {
  id: string;
  name: string;
  version: string;

  /** Drizzle table definitions for schema extension */
  schema?: Record<string, unknown>;

  /** Agent tools registered by this module */
  tools?: ModuleToolDefinition[];

  /** WebSocket RPC methods */
  rpcMethods?: ModuleRpcDefinition[];

  /** Frontend UI component paths */
  ui?: ModuleUiDescriptor;

  /** Called once when the module is first installed (run migrations) */
  onInstall?(ctx: ModuleContext): Promise<void>;

  /** Called when the module is enabled */
  onEnable?(ctx: ModuleContext): void;

  /** Called when the module is disabled */
  onDisable?(): void;
}
