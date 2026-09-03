"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import api from "../../lib/api";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const router                = useRouter();
  const bottomRef             = useRef<HTMLDivElement>(null);

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden bg-[#F7F8FA] flex flex-col">
        <div className="max-w-4xl w-full mx-auto px-6 py-6 flex flex-col h-full">

          <SectionHeader
            title="Ask CogniStock"
            description="Natural language answers from your live inventory data"
          />

          {/* Message area */}
          <div className="flex-1 overflow-y-auto bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3 mb-4 min-h-0">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex gap-2.5 items-start ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    m.role === "user"
                      ? "bg-[#EFF6FF] text-[#2563EB]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {m.role === "user" ? <User size={13} /> : <Bot size={13} />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] text-sm px-4 py-2.5 rounded-2xl leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB]"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        strong: ({ ...props }) => (
                          <strong className="font-semibold text-[#111827]" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-disc pl-4 space-y-1 mb-2 last:mb-0" {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol className="list-decimal pl-4 space-y-1 mb-2 last:mb-0" {...props} />
                        ),
                        li: ({ ...props }) => <li {...props} />,
                        h1: ({ ...props }) => <p className="font-semibold mb-1" {...props} />,
                        h2: ({ ...props }) => <p className="font-semibold mb-1" {...props} />,
                        h3: ({ ...props }) => <p className="font-semibold mb-1" {...props} />,
                        hr: () => null,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  ) : (
                    m.text
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-[#F3F4F6] text-[#6B7280]">
                  <Bot size={13} />
                </div>
                <div className="text-sm px-4 py-2.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#9CA3AF] flex items-center gap-1.5">
                  <Sparkles size={12} className="animate-pulse text-[#2563EB]" />
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips — only on first message */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg
                    text-[#374151] hover:border-[#2563EB] hover:text-[#2563EB]
                    transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about stock, orders, suppliers…"
              className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm
                text-[#111827] placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-[#111827] text-white rounded-xl
                hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors flex items-center gap-1.5 text-sm font-medium"
            >
              <Send size={15} />
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}