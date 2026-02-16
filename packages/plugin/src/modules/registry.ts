import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db/client.js";
import { crmModules } from "../db/schema.js";
import { registerRpcHandler } from "../services/websocket-server.js";
import type { CrmModule, ModuleContext } from "@clawcrm/shared";

// In-memory registry of loaded modules
const loadedModules = new Map<string, CrmModule>();

/**
 * Register a CRM module at runtime.
 * Handles DB record creation, schema migration, tool and RPC registration.
 */
export async function registerModule(
  mod: CrmModule,
  registerTool?: (def: unknown) => void,
): Promise<void> {
  if (loadedModules.has(mod.id)) {
    throw new Error(`Module "${mod.id}" is already registered`);
  }

  const db = getDb();
  const ctx = createModuleContext(mod.id);

  // Check if module exists in DB, create record if not
  const [existing] = await db
    .select()
    .from(crmModules)
    .where(eq(crmModules.id, mod.id))
    .limit(1);

  if (!existing) {
    await db.insert(crmModules).values({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      enabled: true,
      config: null,
      installedAt: new Date().toISOString(),
    });

    // Run initial install hook (migrations etc.)
    if (mod.onInstall) {
      await mod.onInstall(ctx);
    }
  } else if (existing.version !== mod.version) {
    // Update version
    await db
      .update(crmModules)
      .set({ version: mod.version })
      .where(eq(crmModules.id, mod.id));
  }

  // Register RPC methods with module namespace
  if (mod.rpcMethods) {
    for (const rpc of mod.rpcMethods) {
      const fullName = `crm.module.${mod.id}.${rpc.name}`;
      registerRpcHandler(fullName, (userId, params) =>
        rpc.handler(userId, params, ctx),
      );
    }
  }

  // Register agent tools via the provided callback
  if (mod.tools && registerTool) {
    for (const tool of mod.tools) {
      registerTool({
        name: `crm_${mod.id}_${tool.name}`,
        description: tool.description,
        parameters: tool.parameters,
        execute: async (_id: string, params: unknown) => {
          // userId will be injected by the tool wrapper
          return tool.execute(_id, params, ctx);
        },
      });
    }
  }

  // Call onEnable hook
  if (mod.onEnable) {
    mod.onEnable(ctx);
  }

  loadedModules.set(mod.id, mod);
}

/**
 * Unregister a module (disable it).
 */
export async function unregisterModule(moduleId: string): Promise<void> {
  const mod = loadedModules.get(moduleId);
  if (!mod) return;

  if (mod.onDisable) {
    mod.onDisable();
  }

  loadedModules.delete(moduleId);

  const db = getDb();
  await db
    .update(crmModules)
    .set({ enabled: false })
    .where(eq(crmModules.id, moduleId));
}

/**
 * Get a loaded module by ID.
 */
export function getModule(moduleId: string): CrmModule | undefined {
  return loadedModules.get(moduleId);
}

/**
 * Get all loaded modules.
 */
export function getAllModules(): CrmModule[] {
  return Array.from(loadedModules.values());
}

/**
 * Get installed modules from DB (including disabled ones).
 */
export async function getInstalledModules() {
  const db = getDb();
  return db.select().from(crmModules);
}

// --- Internal helpers ---

function createModuleContext(moduleId: string): ModuleContext {
  return {
    db: getDb(),
    log: (msg: string) => {
      console.log(`[clawcrm:module:${moduleId}] ${msg}`);
    },
  };
}
