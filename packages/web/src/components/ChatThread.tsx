import type { ChatMessage } from "@clawcrm/shared";

interface ChatThreadProps {
  messages: ChatMessage[];
  channelLabel?: string;
}

export default function ChatThread({ messages, channelLabel }: ChatThreadProps) {
  if (messages.length === 0) {
    return <div className="text-center py-8 text-gray-500">No messages.</div>;
  }

  return (
    <div className="space-y-3">
      {channelLabel && (
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {channelLabel}
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
              msg.direction === "outbound"
                ? "bg-blue-600 text-white rounded-br-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
            }`}
          >
            <p>{msg.content}</p>
            <p
              className={`text-xs mt-1 ${
                msg.direction === "outbound"
                  ? "text-blue-200"
                  : "text-gray-500"
              }`}
            >
              {new Date(msg.timestamp).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {msg.channel && ` via ${msg.channel}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
