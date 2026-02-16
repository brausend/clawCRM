import { useEffect } from "react";
import { useStore } from "../lib/store.js";
import { subscribe, rpc } from "../lib/ws-client.js";
import { RpcMethods } from "@clawcrm/shared";

export default function Dashboard() {
  const user = useStore((s) => s.user);
  const orders = useStore((s) => s.orders);
  const chats = useStore((s) => s.chats);
  const setOrders = useStore((s) => s.setOrders);
  const setChats = useStore((s) => s.setChats);

  useEffect(() => {
    // Subscribe to live updates
    subscribe("orders");
    subscribe("chats");

    // Load initial data
    rpc(RpcMethods.LIST_ORDERS).then((data) => {
      if (Array.isArray(data)) setOrders(data);
    });
    rpc(RpcMethods.LIST_CHATS).then((data) => {
      if (Array.isArray(data)) setChats(data);
    });
  }, []);

  const openOrders = orders.filter((o) => o.status === "open");
  const processingOrders = orders.filter((o) => o.status === "processing");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Willkommen, {user?.displayName}
        </h2>
        <p className="text-gray-500 mt-1">Dein CRM auf einen Blick</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Offene Bestellungen"
          value={openOrders.length}
          color="blue"
        />
        <StatCard
          label="In Bearbeitung"
          value={processingOrders.length}
          color="yellow"
        />
        <StatCard
          label="Aktive Chats"
          value={chats.length}
          color="green"
        />
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Letzte Bestellungen
          </h3>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Bestellungen vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {order.title}
                    </p>
                    <p className="text-xs text-gray-500">{order.createdAt}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent chats */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Letzte Chats
          </h3>
          {chats.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine Chats vorhanden.</p>
          ) : (
            <div className="space-y-3">
              {chats.slice(0, 5).map((chat) => (
                <div key={chat.chatId} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {chat.channel}
                    </span>
                    <span className="text-xs text-gray-400">
                      {chat.count} Nachrichten
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 truncate">
                    {chat.lastMessage}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "yellow" | "green";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    yellow:
      "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300",
    green:
      "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300",
  };

  return (
    <div
      className={`rounded-xl p-5 ${colors[color]}`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
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
