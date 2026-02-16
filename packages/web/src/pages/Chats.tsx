import { useEffect, useState } from "react";
import { useStore, type ChatThread as ChatThreadType } from "../lib/store.js";
import { rpc, subscribe } from "../lib/ws-client.js";
import { RpcMethods } from "@clawcrm/shared";
import type { ChatMessage } from "@clawcrm/shared";
import ChatThread from "../components/ChatThread.js";

export default function Chats() {
  const chats = useStore((s) => s.chats);
  const setChats = useStore((s) => s.setChats);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    subscribe("chats");
    rpc<ChatThreadType[]>(RpcMethods.LIST_CHATS).then(setChats);
  }, []);

  const loadMessages = async (chatId: string) => {
    setSelectedChat(chatId);
    const msgs = await rpc<ChatMessage[]>(RpcMethods.GET_CHAT_MESSAGES, {
      chatId,
      limit: 50,
    });
    setMessages(msgs);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Chats
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat list */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-500">
              Alle Kanaele aggregiert
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {chats.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Keine Chats vorhanden.</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.chatId}
                  onClick={() => loadMessages(chat.chatId)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedChat === chat.chatId
                      ? "bg-blue-50 dark:bg-blue-950"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {chat.channel}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(chat.timestamp).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 truncate">
                    {chat.lastMessage}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat messages */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          {selectedChat ? (
            <ChatThread
              messages={messages}
              channelLabel={
                chats.find((c) => c.chatId === selectedChat)?.channel
              }
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Waehle einen Chat aus
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
