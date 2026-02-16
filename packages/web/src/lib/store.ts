import { create } from "zustand";
import type { CrmUser, Order, ChatMessage, Project, Task } from "@clawcrm/shared";

interface AppState {
  // Auth
  user: CrmUser | null;
  sessionToken: string | null;
  setUser: (user: CrmUser | null, token?: string | null) => void;
  logout: () => void;

  // Pairing
  wsToken: string | null;
  isPaired: boolean;
  setWsToken: (token: string) => void;

  // Data
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  chats: ChatThread[];
  setChats: (chats: ChatThread[]) => void;
  contacts: ContactInfo[];
  setContacts: (contacts: ContactInfo[]) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;

  // Connection status
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

export interface ChatThread {
  chatId: string;
  channel: string;
  lastMessage: string;
  timestamp: string;
  count: number;
}

export interface ContactInfo {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  user: null,
  sessionToken: null,
  setUser: (user, token) =>
    set({ user, sessionToken: token ?? null }),
  logout: () => {
    localStorage.removeItem("clawcrm_session");
    set({ user: null, sessionToken: null });
  },

  // Pairing
  wsToken: localStorage.getItem("clawcrm_ws_token"),
  isPaired: !!localStorage.getItem("clawcrm_ws_token"),
  setWsToken: (token) => {
    localStorage.setItem("clawcrm_ws_token", token);
    set({ wsToken: token, isPaired: true });
  },

  // Data
  orders: [],
  setOrders: (orders) => set({ orders }),
  chats: [],
  setChats: (chats) => set({ chats }),
  contacts: [],
  setContacts: (contacts) => set({ contacts }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  tasks: [],
  setTasks: (tasks) => set({ tasks }),

  // Connection
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
