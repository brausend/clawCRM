import { initDatabase } from "./db/client.js";
import { configurePasskey } from "./auth/passkey.js";
import { resolveIdentity } from "./auth/identity-resolver.js";
import {
  startWsServer,
  stopWsServer,
  registerRpcHandler,
} from "./services/websocket-server.js";
import {
  startSessionManager,
  stopSessionManager,
} from "./services/session-manager.js";
import { registerModule } from "./modules/registry.js";
import { syncChatMessage } from "./services/chat-sync.js";

// Tools
import { crmAuthStatusTool } from "./tools/crm-auth.js";
import {
  crmListOrdersTool,
  crmCreateOrderTool,
  crmUpdateOrderTool,
} from "./tools/crm-orders.js";
import { crmListContactsTool, crmSearchTool } from "./tools/crm-contacts.js";
import {
  crmManageProjectTool,
  crmManageTasksTool,
} from "./tools/crm-projects.js";
import {
  crmAdminPermissionsTool,
  crmAdminUsersTool,
  crmAdminInstanceKeyTool,
} from "./tools/crm-admin.js";

// Commands
import { crmAuthCommand, crmLinkCommand } from "./commands/auth-commands.js";
import { crmAdminCommand } from "./commands/admin-commands.js";
import {
  crmWhoamiCommand,
  crmStatusCommand,
} from "./commands/status-commands.js";

// RPC handlers (WebSocket)
import { rpcHandlers } from "./rpc/index.js";

export const id = "clawcrm";
export const name = "ClawCRM";

interface PluginConfig {
  dbPath?: string;
  wsPort?: number;
  wsAllowedOrigins?: string[];
  defaultPolicy?: string;
  adminUsers?: string[];
  modules?: string[];
  maxPairedInstances?: number;
}

/**
 * Main plugin registration function.
 * Called by OpenClaw when the plugin is loaded.
 */
export function register(api: {
  config: { plugins?: { entries?: { clawcrm?: { config?: PluginConfig } } } };
  registerTool: (def: unknown, opts?: { optional?: boolean }) => void;
  registerCommand: (def: unknown) => void;
  registerService: (def: {
    id: string;
    start: () => void;
    stop: () => void;
  }) => void;
  logger: { info: (msg: string) => void; error: (msg: string) => void };
}) {
  const cfg: PluginConfig =
    api.config.plugins?.entries?.clawcrm?.config ?? {};
  const dbPath = cfg.dbPath ?? "~/.openclaw/clawcrm.db";
  const wsPort = cfg.wsPort ?? 3848;
  const wsAllowedOrigins = cfg.wsAllowedOrigins ?? [];

  // Initialize database
  const resolvedPath = dbPath.replace("~", process.env.HOME ?? "");
  initDatabase(resolvedPath);
  api.logger.info(`ClawCRM database initialized at ${resolvedPath}`);

  // Configure passkey RP settings
  if (wsAllowedOrigins.length > 0) {
    const firstOrigin = wsAllowedOrigins[0];
    try {
      const url = new URL(firstOrigin);
      configurePasskey({
        rpId: url.hostname,
        origin: firstOrigin,
      });
    } catch {
      // Keep defaults
    }
  }

  // Register agent tools
  const tools = [
    crmAuthStatusTool,
    crmListOrdersTool,
    crmCreateOrderTool,
    crmUpdateOrderTool,
    crmListContactsTool,
    crmSearchTool,
    crmManageProjectTool,
    crmManageTasksTool,
  ];

  for (const tool of tools) {
    api.registerTool(tool);
  }

  // Admin tools (optional — must be explicitly enabled)
  const adminTools = [
    crmAdminPermissionsTool,
    crmAdminUsersTool,
    crmAdminInstanceKeyTool,
  ];

  for (const tool of adminTools) {
    api.registerTool(tool, { optional: true });
  }

  // Register slash commands
  const commands = [
    crmAuthCommand,
    crmLinkCommand,
    crmAdminCommand,
    crmWhoamiCommand,
    crmStatusCommand,
  ];

  for (const cmd of commands) {
    api.registerCommand(cmd);
  }

  // Register RPC handlers for WebSocket
  for (const [method, handler] of Object.entries(rpcHandlers)) {
    registerRpcHandler(method, handler);
  }

  // Background services
  api.registerService({
    id: "clawcrm-ws",
    start: () => {
      startWsServer(wsPort, wsAllowedOrigins);
      api.logger.info(`ClawCRM WebSocket server started on port ${wsPort}`);
    },
    stop: () => {
      stopWsServer();
    },
  });

  api.registerService({
    id: "clawcrm-sessions",
    start: () => startSessionManager(),
    stop: () => stopSessionManager(),
  });

  api.logger.info("ClawCRM plugin registered successfully");
}

// Default export for OpenClaw plugin loading
export default { id, name, register };
