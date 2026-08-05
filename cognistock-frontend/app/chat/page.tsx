"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import api from "../../lib/api";
import { Send, Sparkles, Bot, User } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Which products are low on stock?",
  "How many orders are pending?",
  "Which supplier has the fastest delivery?",
  "What is the total value of current inventory?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", text: "Hi! Ask me anything about your inventory, orders, or suppliers." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    api
      .post("/nlbi/ask", { question })
      .then((res) => {
        setMessages((prev) => [...prev, { role: "assistant", text: res.data.answer }]);
        setLoading(false);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Something went wrong. Please try again." },
        ]);
        setLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 flex flex-col p-6 relative overflow-hidden max-h-screen">
        <div className="absolute top-0 right-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mb-4">
          <h1 className="text-white text-lg font-medium mb-1 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            Ask CogniStock
          </h1>
          <p className="text-gray-500 text-sm">Natural language answers from your live inventory data</p>
        </div>

        <div className="flex-1 overflow-y-auto relative z-10 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-3 mb-4">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 items-start ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  m.role === "user" ? "bg-blue-600/30 text-blue-300" : "bg-purple-600/30 text-purple-300"
                }`}
              >
                {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`max-w-[75%] text-sm px-4 py-2.5 rounded-2xl leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-600/20 text-blue-50 border border-blue-500/20"
                    : "bg-white/[0.05] text-gray-200 border border-white/[0.08]"
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex gap-2 items-start">
              <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-purple-600/30 text-purple-300">
                <Bot size={14} />
              </div>
              <div className="text-sm px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-gray-500">
                Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-3 relative z-10">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.1] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2 relative z-10"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about stock, orders, suppliers..."
            className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}