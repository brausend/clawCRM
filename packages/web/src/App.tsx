import { Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./lib/store.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Chats from "./pages/Chats.js";
import Orders from "./pages/Orders.js";
import Contacts from "./pages/Contacts.js";
import Projects from "./pages/Projects.js";
import Admin from "./pages/Admin.js";
import ModuleView from "./pages/ModuleView.js";
import Sidebar from "./components/Sidebar.js";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const user = useStore((s) => s.user);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <Contacts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/module/:moduleId"
            element={
              <ProtectedRoute>
                <ModuleView />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
