import { useEffect } from "react";
import { useStore } from "../lib/store.js";
import { rpc, subscribe } from "../lib/ws-client.js";
import { RpcMethods } from "@clawcrm/shared";
import type { Order } from "@clawcrm/shared";
import DataTable from "../components/DataTable.js";

export default function Orders() {
  const orders = useStore((s) => s.orders);
  const setOrders = useStore((s) => s.setOrders);

  useEffect(() => {
    subscribe("orders");
    rpc<Order[]>(RpcMethods.LIST_ORDERS).then(setOrders);
  }, []);

  const columns = [
    { key: "title" as const, label: "Order" },
    {
      key: "status" as const,
      label: "Status",
      render: (row: Order) => <StatusBadge status={row.status} />,
    },
    { key: "notes" as const, label: "Notizen" },
    {
      key: "createdAt" as const,
      label: "Created",
      render: (row: Order) =>
        new Date(row.createdAt).toLocaleDateString("de-DE"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Orders
        </h2>
        <span className="text-sm text-gray-500">
          {orders.length} Orders
        </span>
      </div>

      <DataTable columns={columns} data={orders} emptyMessage="No orders found." />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    processing:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status] ?? styles.open}`}
    >
      {status}
    </span>
  );
}
