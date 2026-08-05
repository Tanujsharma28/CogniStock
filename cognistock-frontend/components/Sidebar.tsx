"use client";

import { LayoutDashboard, Box, Truck, Receipt, Sparkles, MessageSquare, Clock, Sun, LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { removeToken } from "../lib/auth";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Morning Brief", icon: Sun, path: "/morning-brief" },
  { label: "Inventory", icon: Box, path: "/inventory" },
  { label: "Suppliers", icon: Truck, path: "/suppliers" },
  { label: "Orders", icon: Receipt, path: "/orders" },
  { label: "AI Insights", icon: Sparkles, path: "/ai-insights" },
  { label: "AI Chat", icon: MessageSquare, path: "/chat" },
  { label: "AI Timeline", icon: Clock, path: "/ai-timeline" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  return (
    <div className="w-56 bg-[#0a0d16] border-r border-white/[0.06] p-4 flex-shrink-0 min-h-screen flex flex-col">
      <div className="flex items-center gap-2 mb-8 px-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="text-white font-medium">CogniStock</span>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <div
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${
                active
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </div>
          );
        })}
      </div>

      <div
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm cursor-pointer text-gray-500 hover:text-red-400 hover:bg-white/[0.03] transition-all"
      >
        <LogOut size={16} />
        Logout
      </div>
    </div>
  );
}