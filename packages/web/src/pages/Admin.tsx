import { useEffect, useState } from "react";
import { useStore } from "../lib/store.js";
import { rpc } from "../lib/ws-client.js";
import { RpcMethods } from "@clawcrm/shared";
import type { CrmUser, Permission, InstalledModule } from "@clawcrm/shared";
import DataTable from "../components/DataTable.js";

type Tab = "users" | "permissions" | "modules";

export default function Admin() {
  const user = useStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("users");
  const [allUsers, setAllUsers] = useState<CrmUser[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [allModules, setAllModules] = useState<InstalledModule[]>([]);

  useEffect(() => {
    if (user?.role !== "admin") return;

    rpc<CrmUser[]>(RpcMethods.ADMIN_USERS).then(setAllUsers).catch(() => {});
    rpc<Permission[]>(RpcMethods.ADMIN_PERMISSIONS)
      .then(setAllPermissions)
      .catch(() => {});
    rpc<InstalledModule[]>(RpcMethods.ADMIN_MODULES)
      .then(setAllModules)
      .catch(() => {});
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12 text-gray-500">
        Admin-Zugang erforderlich.
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "Benutzer" },
    { id: "permissions", label: "Berechtigungen" },
    { id: "modules", label: "Module" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Admin
      </h2>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "users" && (
        <DataTable
          columns={[
            { key: "displayName", label: "Name" },
            { key: "email", label: "E-Mail" },
            { key: "role", label: "Rolle" },
            { key: "createdAt", label: "Erstellt" },
          ]}
          data={allUsers as unknown as Record<string, unknown>[]}
        />
      )}

      {tab === "permissions" && (
        <DataTable
          columns={[
            { key: "subjectType", label: "Typ" },
            { key: "subjectId", label: "Subjekt" },
            { key: "resource", label: "Resource" },
            { key: "resourceId", label: "Resource ID" },
            { key: "action", label: "Aktion" },
          ]}
          data={allPermissions as unknown as Record<string, unknown>[]}
        />
      )}

      {tab === "modules" && (
        <DataTable
          columns={[
            { key: "name", label: "Modul" },
            { key: "version", label: "Version" },
            {
              key: "enabled",
              label: "Status",
              render: (row: Record<string, unknown>) => (
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    row.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {row.enabled ? "Aktiv" : "Deaktiviert"}
                </span>
              ),
            },
            { key: "installedAt", label: "Installiert" },
          ]}
          data={allModules as unknown as Record<string, unknown>[]}
          emptyMessage="Keine Module installiert."
        />
      )}
    </div>
  );
}
