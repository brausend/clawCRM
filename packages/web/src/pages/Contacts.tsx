import { useEffect, useState } from "react";
import { useStore, type ContactInfo } from "../lib/store.js";
import { rpc } from "../lib/ws-client.js";
import { RpcMethods } from "@clawcrm/shared";
import DataTable from "../components/DataTable.js";

export default function Contacts() {
  const contacts = useStore((s) => s.contacts);
  const setContacts = useStore((s) => s.setContacts);
  const [search, setSearch] = useState("");

  useEffect(() => {
    rpc<ContactInfo[]>(RpcMethods.LIST_CONTACTS).then(setContacts);
  }, []);

  const filtered = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase())),
      )
    : contacts;

  const columns = [
    { key: "name" as const, label: "Name" },
    { key: "email" as const, label: "E-Mail" },
    { key: "role" as const, label: "Rolle" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Contacts
        </h2>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="No contacts found."
      />
    </div>
  );
}
