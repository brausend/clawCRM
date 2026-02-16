import type {
  CrmModule,
  ModuleToolDefinition,
  ModuleRpcDefinition,
  ModuleUiDescriptor,
  ModuleContext,
} from "@clawcrm/shared";

/**
 * Abstract base class for CRM modules.
 * Provides a convenient way to implement the CrmModule interface.
 */
export abstract class BaseCrmModule implements CrmModule {
  abstract id: string;
  abstract name: string;
  abstract version: string;

  schema?: Record<string, unknown>;
  tools?: ModuleToolDefinition[];
  rpcMethods?: ModuleRpcDefinition[];
  ui?: ModuleUiDescriptor;

  async onInstall(_ctx: ModuleContext): Promise<void> {
    // Override in subclass to run migrations
  }

  onEnable(_ctx: ModuleContext): void {
    // Override in subclass for startup logic
  }

  onDisable(): void {
    // Override in subclass for cleanup
  }
}
