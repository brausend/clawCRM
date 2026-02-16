import { NavLink } from "react-router-dom";
import { useStore } from "../lib/store.js";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/chats", label: "Chats", icon: "💬" },
  { to: "/orders", label: "Bestellungen", icon: "📦" },
  { to: "/contacts", label: "Kontakte", icon: "👥" },
  { to: "/projects", label: "Projekte", icon: "📋" },
];

export default function Sidebar() {
  const user = useStore((s) => s.user);
  const connected = useStore((s) => s.connected);
  const logout = useStore((s) => s.logout);

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          ClawCRM
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Verbunden" : "Getrennt"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <span>⚙️</span>
            Admin
          </NavLink>
        )}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.displayName}
            </p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Abmelden
          </button>
        </div>
      </div>
    </aside>
  );
}
