import type { CrmModule, ModuleContext } from "@clawcrm/shared";

/**
 * Contracts module for ClawCRM.
 * Allows users to store, view, and manage contracts (e.g. gas, electricity, etc.).
 */
const contractsModule: CrmModule = {
  id: "contracts",
  name: "Vertraege",
  version: "0.1.0",

  tools: [
    {
      name: "list",
      description: "List contracts for the current user.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: active, expired, cancelled" },
        },
      },
      execute: async (userId: string, params: unknown, ctx: ModuleContext) => {
        const db = ctx.db as { prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] } };
        const p = params as { status?: string };

        let rows;
        if (p.status) {
          rows = db
            .prepare("SELECT * FROM module_data WHERE module_id = ? AND user_id = ? AND entity_type = 'contract' AND json_extract(data, '$.status') = ?")
            .all("contracts", userId, p.status);
        } else {
          rows = db
            .prepare("SELECT * FROM module_data WHERE module_id = ? AND user_id = ? AND entity_type = 'contract'")
            .all("contracts", userId);
        }

        return rows;
      },
    },
    {
      name: "create",
      description: "Create a new contract entry.",
      parameters: {
        type: "object",
        properties: {
          provider: { type: "string", description: "Contract provider name" },
          contractType: { type: "string", description: "Type: gas, electricity, internet, etc." },
          startDate: { type: "string", description: "Start date (ISO)" },
          endDate: { type: "string", description: "End date (ISO)" },
          monthlyAmount: { type: "number", description: "Monthly payment amount" },
          notes: { type: "string" },
        },
        required: ["provider", "contractType"],
      },
      execute: async (userId: string, params: unknown, ctx: ModuleContext) => {
        const db = ctx.db as { prepare: (sql: string) => { run: (...args: unknown[]) => void } };
        const p = params as {
          provider: string;
          contractType: string;
          startDate?: string;
          endDate?: string;
          monthlyAmount?: number;
          notes?: string;
        };

        const id = `con_${Date.now()}`;
        const now = new Date().toISOString();
        const data = JSON.stringify({
          provider: p.provider,
          contractType: p.contractType,
          startDate: p.startDate ?? null,
          endDate: p.endDate ?? null,
          monthlyAmount: p.monthlyAmount ?? null,
          notes: p.notes ?? null,
          status: "active",
        });

        db.prepare(
          "INSERT INTO module_data (id, module_id, user_id, entity_type, entity_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(id, "contracts", userId, "contract", id, data, now, now);

        ctx.log(`Contract created: ${id}`);
        return { id, provider: p.provider };
      },
    },
  ],

  rpcMethods: [
    {
      name: "list",
      handler: async (userId: string, params: unknown, ctx: ModuleContext) => {
        const db = ctx.db as { prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] } };
        const rows = db
          .prepare("SELECT * FROM module_data WHERE module_id = ? AND user_id = ? AND entity_type = 'contract' ORDER BY created_at DESC")
          .all("contracts", userId);

        return rows.map((row: unknown) => {
          const r = row as { id: string; data: string; created_at: string };
          return { id: r.id, ...JSON.parse(r.data), createdAt: r.created_at };
        });
      },
    },
  ],

  ui: {
    listView: "./ui/ContractList",
    detailView: "./ui/ContractDetail",
  },

  async onInstall(ctx: ModuleContext) {
    ctx.log("Contracts module installed. Using module_data table for storage.");
  },

  onEnable(ctx: ModuleContext) {
    ctx.log("Contracts module enabled.");
  },
};

export default contractsModule;
